-- Setup for appointment reminders cron job using Supabase pg_cron
-- This script sets up cron jobs to send appointment reminders to notaries
-- 
-- REQUIREMENTS:
-- 1. Enable the "Cron" integration in Supabase Dashboard > Integrations
-- 2. Enable the "pg_net" extension (required for HTTP calls from pg_cron)
-- 3. Deploy the "send-appointment-reminders" Edge Function
-- 4. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
--
-- INSTRUCTIONS:
-- 1. Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- 2. Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- 3. Execute this script in the Supabase SQL Editor
--
-- The cron jobs will:
-- - Run every hour to check for appointments needing reminders
-- - Send day-before reminders for appointments tomorrow
-- - Send one-hour-before reminders for appointments in ~1 hour

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to call the Edge Function
-- This function will be called by pg_cron
CREATE OR REPLACE FUNCTION public.get_appointments_needing_reminders()
RETURNS TABLE (
  submission_id UUID,
  notary_email TEXT,
  notary_name TEXT,
  appointment_date DATE,
  appointment_time TIME,
  reminder_type TEXT,
  client_name TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  timezone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tomorrow_date DATE;
  today_date DATE;
  current_time TIME;
  one_hour_from_now TIME;
BEGIN
  -- Get dates
  tomorrow_date := (CURRENT_DATE + INTERVAL '1 day');
  today_date := CURRENT_DATE;
  current_time := CURRENT_TIME;
  one_hour_from_now := (CURRENT_TIME + INTERVAL '1 hour');

  -- Return appointments for tomorrow (day before reminder)
  RETURN QUERY
  SELECT
    s.id AS submission_id,
    n.email AS notary_email,
    COALESCE(n.full_name, 'Notary') AS notary_name,
    s.appointment_date,
    s.appointment_time::TIME AS appointment_time,
    'day_before' AS reminder_type,
    (s.first_name || ' ' || s.last_name) AS client_name,
    s.address,
    s.city,
    s.country,
    COALESCE(s.timezone, n.timezone, 'UTC') AS timezone
  FROM public.submission s
  INNER JOIN public.notary n ON s.assigned_notary_id = n.id
  WHERE s.appointment_date = tomorrow_date
    AND s.status IN ('confirmed', 'accepted')
    AND s.assigned_notary_id IS NOT NULL
    AND s.appointment_time IS NOT NULL
    AND n.email IS NOT NULL
    AND n.is_active = true;

  -- Return appointments in 1 hour (one hour before reminder)
  -- We check if appointment_time is within 5 minutes of one_hour_from_now
  RETURN QUERY
  SELECT
    s.id AS submission_id,
    n.email AS notary_email,
    COALESCE(n.full_name, 'Notary') AS notary_name,
    s.appointment_date,
    s.appointment_time::TIME AS appointment_time,
    'one_hour_before' AS reminder_type,
    (s.first_name || ' ' || s.last_name) AS client_name,
    s.address,
    s.city,
    s.country,
    COALESCE(s.timezone, n.timezone, 'UTC') AS timezone
  FROM public.submission s
  INNER JOIN public.notary n ON s.assigned_notary_id = n.id
  WHERE s.appointment_date = today_date
    AND s.status IN ('confirmed', 'accepted')
    AND s.assigned_notary_id IS NOT NULL
    AND s.appointment_time IS NOT NULL
    AND n.email IS NOT NULL
    AND n.is_active = true
    AND ABS(EXTRACT(EPOCH FROM (s.appointment_time::TIME - one_hour_from_now)) / 60) <= 5; -- Within 5 minutes
END;
$$;

-- Grant execute permission to authenticated users (or service role)
GRANT EXECUTE ON FUNCTION public.get_appointments_needing_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointments_needing_reminders() TO service_role;

-- ============================================================================
-- CRON JOBS SETUP
-- ============================================================================
-- 
-- IMPORTANT: Replace the following placeholders:
-- - YOUR_PROJECT_REF: Your Supabase project reference (e.g., "abcdefghijklmnop")
-- - YOUR_SERVICE_ROLE_KEY: Your Supabase service role key
--
-- To find these values:
-- 1. Project Ref: Supabase Dashboard > Project Settings > General > Reference ID
-- 2. Service Role Key: Supabase Dashboard > Project Settings > API > service_role key
--
-- ============================================================================

-- Remove existing cron jobs if they exist (to avoid duplicates)
SELECT cron.unschedule('appointment-reminders-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminders-hourly'
);

-- Schedule cron job to run every hour
-- This will check for both day-before and one-hour-before reminders
SELECT cron.schedule(
  'appointment-reminders-hourly',                    -- Job name
  '0 * * * *',                                       -- Schedule: Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'apikey', 'YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alternative: Run every 15 minutes for more precise one-hour-before reminders
-- Uncomment the following if you want more frequent checks:
-- SELECT cron.schedule(
--   'appointment-reminders-15min',
--   '*/15 * * * *',  -- Every 15 minutes
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'apikey', 'YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$);
--
-- Note: If using the 15-minute schedule, you can remove the hourly schedule above

-- Create a table to track sent reminders (optional, to avoid duplicate emails)
CREATE TABLE IF NOT EXISTS public.appointment_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submission(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('day_before', 'one_hour_before')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(submission_id, reminder_type, sent_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointment_reminder_log_submission ON public.appointment_reminder_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminder_log_sent_at ON public.appointment_reminder_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_appointment_reminder_log_sent_date ON public.appointment_reminder_log(sent_date);

-- Create a trigger to automatically set sent_date when sent_at is updated
CREATE OR REPLACE FUNCTION public.set_reminder_log_sent_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.sent_date := DATE(NEW.sent_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_reminder_log_sent_date ON public.appointment_reminder_log;
CREATE TRIGGER trigger_set_reminder_log_sent_date
  BEFORE INSERT OR UPDATE OF sent_at ON public.appointment_reminder_log
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reminder_log_sent_date();

-- Enable RLS
ALTER TABLE public.appointment_reminder_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can insert reminder logs
CREATE POLICY "Service role can manage reminder logs"
  ON public.appointment_reminder_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON FUNCTION public.get_appointments_needing_reminders() IS 'Returns appointments that need reminders (day before or one hour before)';
COMMENT ON TABLE public.appointment_reminder_log IS 'Tracks sent appointment reminders to avoid duplicates';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- 
-- To verify the cron jobs are scheduled correctly, run:
-- SELECT * FROM cron.job WHERE jobname LIKE 'appointment-reminders%';
--
-- To view cron job execution history:
-- SELECT * FROM cron.job_run_details WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname LIKE 'appointment-reminders%'
-- ) ORDER BY start_time DESC LIMIT 10;
--
-- To manually test the Edge Function (replace placeholders):
-- SELECT net.http_post(
--   url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--     'apikey', 'YOUR_SERVICE_ROLE_KEY'
--   ),
--   body := '{}'::jsonb
-- );
--
-- To remove a cron job:
-- SELECT cron.unschedule('appointment-reminders-hourly');
--
-- ============================================================================


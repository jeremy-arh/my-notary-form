-- Setup for appointment reminders cron job
-- This script sets up a cron job to send appointment reminders to notaries
-- 
-- NOTE: Supabase doesn't support direct HTTP calls from pg_cron to Edge Functions.
-- You have two options:
-- 1. Use an external cron service (recommended) - see NOTARY_EMAIL_NOTIFICATIONS_SETUP.md
-- 2. Use this SQL to create a database function that can be called by pg_cron
--    (but you'll need to call the Edge Function from your application or use a webhook)

-- Option 1: Create a function that logs appointments needing reminders
-- This function can be called by pg_cron and then your application can process them
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


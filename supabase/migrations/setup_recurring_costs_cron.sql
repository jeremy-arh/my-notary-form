-- Setup cron job for generating recurring webservice costs
-- This script sets up a cron job to generate monthly recurring costs
-- 
-- REQUIREMENTS:
-- 1. Enable the "Cron" integration in Supabase Dashboard > Integrations
-- 2. Enable the "pg_net" extension (required for HTTP calls from pg_cron)
-- 3. Deploy the "generate-recurring-costs" Edge Function
-- 4. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
--
-- INSTRUCTIONS:
-- 1. Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- 2. Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- 3. Execute this script in the Supabase SQL Editor
--
-- The cron job will:
-- - Run every day at 8:00 AM
-- - Generate monthly recurring costs for active templates

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron job if it exists (to avoid duplicates)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-recurring-webservice-costs') THEN
    PERFORM cron.unschedule('generate-recurring-webservice-costs');
  END IF;
END $$;

-- Schedule cron job to run every day at 8:00 AM
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with your actual values
SELECT cron.schedule(
  'generate-recurring-webservice-costs',                    -- Job name
  '0 8 * * *',                                             -- Schedule: Every day at 8:00 AM (format: minute hour day month weekday)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-recurring-costs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'apikey', 'YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Add comment
COMMENT ON EXTENSION pg_cron IS 'Used to schedule recurring webservice costs generation';
COMMENT ON EXTENSION pg_net IS 'Used to make HTTP calls to Edge Functions from cron jobs';

-- Query to check if the cron job is scheduled
-- SELECT * FROM cron.job WHERE jobname = 'generate-recurring-webservice-costs';

-- Query to see all scheduled cron jobs
-- SELECT * FROM cron.job;

-- Query to see cron job execution history
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-recurring-webservice-costs') ORDER BY start_time DESC LIMIT 10;

-- To manually unschedule the cron job:
-- SELECT cron.unschedule('generate-recurring-webservice-costs');

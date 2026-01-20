-- Setup cron job for abandoned cart email sequence
-- This script sets up a cron job to send abandoned cart emails to submissions with status 'pending_payment'

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron job if it exists (to avoid duplicates)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-abandoned-cart-emails') THEN
    PERFORM cron.unschedule('send-abandoned-cart-emails');
  END IF;
END $$;

-- Schedule cron job to run every hour
-- This will check for submissions with status 'pending_payment' that need to receive abandoned cart emails
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with your actual values
SELECT cron.schedule(
  'send-abandoned-cart-emails',                    -- Job name
  '0 * * * *',                                     -- Schedule: Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-abandoned-cart-emails',
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
COMMENT ON EXTENSION pg_cron IS 'Used to schedule abandoned cart email sequence';
COMMENT ON EXTENSION pg_net IS 'Used to make HTTP calls to Edge Functions from cron jobs';

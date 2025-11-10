-- Migration: Integrate email notifications with SendGrid
-- This migration adds email sending capability to the notification system

-- Function to send notification email via Edge Function
-- Note: This requires the pg_net extension or http extension to be enabled
CREATE OR REPLACE FUNCTION public.send_notification_email(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase URL from environment or use default
  -- You should set this in your database settings or use the project URL
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- If not set, you need to replace YOUR_PROJECT_REF with your actual project reference
  IF supabase_url IS NULL OR supabase_url = '' THEN
    -- Replace YOUR_PROJECT_REF with your actual Supabase project reference
    -- You can find it in Supabase Dashboard > Project Settings > General > Reference ID
    supabase_url := 'https://YOUR_PROJECT_REF.supabase.co';
  END IF;
  
  function_url := supabase_url || '/functions/v1/send-notification-email';
  
  -- Get service role key from secrets (stored in Supabase Vault)
  -- This should be set as a database secret
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If pg_net extension is available, use it for async HTTP requests
  -- Otherwise, we'll use a different approach with triggers and Edge Functions
  BEGIN
    -- Try to use pg_net extension (if available)
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
      ),
      body := jsonb_build_object('notification_id', notification_id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- If pg_net is not available, log the error
    -- The email will be sent via a trigger or webhook instead
    RAISE NOTICE 'pg_net extension not available. Email will be sent via alternative method.';
  END;
END;
$$;

-- Alternative: Use a simpler approach with a trigger that calls the Edge Function
-- This approach uses Supabase's built-in webhook functionality
-- You can also call the Edge Function directly from your application code

-- Modify create_notification function to add p_send_email parameter
-- Note: Email sending is handled from application code, not from database
-- This parameter is kept for compatibility but email sending happens via Edge Function
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_user_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_action_type VARCHAR(100) DEFAULT NULL,
  p_action_data JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_created_by_type VARCHAR(50) DEFAULT NULL,
  p_send_email BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    user_type,
    title,
    message,
    type,
    action_type,
    action_data,
    created_by,
    created_by_type
  )
  VALUES (
    p_user_id,
    p_user_type,
    p_title,
    p_message,
    p_type,
    p_action_type,
    p_action_data,
    p_created_by,
    p_created_by_type
  )
  RETURNING id INTO notification_id;
  
  -- Email sending is handled from application code using supabase.functions.invoke()
  -- See sendNotificationEmail.js utility functions in each dashboard
  -- This approach is more reliable than database triggers
  
  RETURN notification_id;
END;
$$;

-- Add a column to track if email was sent (optional)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for email tracking
CREATE INDEX IF NOT EXISTS idx_notifications_email_sent ON public.notifications(email_sent);

-- Comment on function
COMMENT ON FUNCTION public.send_notification_email IS 'Sends notification email via SendGrid Edge Function. Requires pg_net extension or should be called from application code.';
COMMENT ON FUNCTION public.create_notification IS 'Creates a notification. Email sending should be handled separately via application code or webhook.';


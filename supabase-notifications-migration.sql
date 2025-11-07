-- Migration: Create notifications system
-- This migration creates the notifications table and related functions

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- Can be admin_user.id, notary.id, or client.id
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('admin', 'notary', 'client')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  action_type VARCHAR(100), -- e.g., 'appointment_updated', 'submission_modified', 'status_changed'
  action_data JSONB, -- Additional data related to the action
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID, -- ID of the user who triggered the notification
  created_by_type VARCHAR(50) CHECK (created_by_type IN ('admin', 'notary', 'client', 'system'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_action_type ON public.notifications(action_type);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Admins can see all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_user
      WHERE admin_user.user_id = auth.uid()
    )
  );

-- Notaries can see their own notifications
CREATE POLICY "Notaries can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_type = 'notary' AND
    EXISTS (
      SELECT 1 FROM public.notary
      WHERE notary.id = notifications.user_id
      AND notary.user_id = auth.uid()
    )
  );

-- Clients can see their own notifications
CREATE POLICY "Clients can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_type = 'client' AND
    EXISTS (
      SELECT 1 FROM public.client
      WHERE client.id = notifications.user_id
      AND client.user_id = auth.uid()
    )
  );

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_user
      WHERE admin_user.user_id = auth.uid()
    )
  );

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE id = notification_id;
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  p_user_id UUID,
  p_user_type VARCHAR(50)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = p_user_id
  AND user_type = p_user_type
  AND is_read = false;
END;
$$;

-- Function to create notification (can be called from triggers or application)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_user_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_action_type VARCHAR(100) DEFAULT NULL,
  p_action_data JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_created_by_type VARCHAR(50) DEFAULT NULL
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
  
  RETURN notification_id;
END;
$$;

-- Trigger function to create notification when submission status changes
CREATE OR REPLACE FUNCTION public.notify_submission_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  client_user_id UUID;
  notary_user_id UUID;
BEGIN
  -- Notify client if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get client user_id
    SELECT user_id INTO client_user_id
    FROM public.client
    WHERE id = NEW.client_id;
    
    IF client_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.client_id,
        'client',
        'Submission Status Updated',
        'Your submission status has been changed from ' || OLD.status || ' to ' || NEW.status || '.',
        'info',
        'status_changed',
        jsonb_build_object(
          'submission_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;
    
    -- Notify notary if assigned
    IF NEW.assigned_notary_id IS NOT NULL THEN
      SELECT user_id INTO notary_user_id
      FROM public.notary
      WHERE id = NEW.assigned_notary_id;
      
      IF notary_user_id IS NOT NULL THEN
        PERFORM public.create_notification(
          NEW.assigned_notary_id,
          'notary',
          'Submission Status Updated',
          'Submission #' || SUBSTRING(NEW.id::text, 1, 8) || ' status changed from ' || OLD.status || ' to ' || NEW.status || '.',
          'info',
          'status_changed',
          jsonb_build_object(
            'submission_id', NEW.id,
            'old_status', OLD.status,
            'new_status', NEW.status
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for submission status changes
DROP TRIGGER IF EXISTS trigger_notify_submission_status_change ON public.submission;
CREATE TRIGGER trigger_notify_submission_status_change
  AFTER UPDATE OF status ON public.submission
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_submission_status_change();

-- Trigger function to create notification when notary is assigned
CREATE OR REPLACE FUNCTION public.notify_notary_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  notary_user_id UUID;
  client_user_id UUID;
BEGIN
  -- Notify notary when assigned
  IF NEW.assigned_notary_id IS NOT NULL AND (OLD.assigned_notary_id IS NULL OR OLD.assigned_notary_id != NEW.assigned_notary_id) THEN
    SELECT user_id INTO notary_user_id
    FROM public.notary
    WHERE id = NEW.assigned_notary_id;
    
    IF notary_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.assigned_notary_id,
        'notary',
        'New Submission Assigned',
        'A new submission has been assigned to you.',
        'info',
        'notary_assigned',
        jsonb_build_object('submission_id', NEW.id)
      );
    END IF;
    
    -- Notify client
    SELECT user_id INTO client_user_id
    FROM public.client
    WHERE id = NEW.client_id;
    
    IF client_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.client_id,
        'client',
        'Notary Assigned',
        'A notary has been assigned to your submission.',
        'success',
        'notary_assigned',
        jsonb_build_object('submission_id', NEW.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for notary assignment
DROP TRIGGER IF EXISTS trigger_notify_notary_assigned ON public.submission;
CREATE TRIGGER trigger_notify_notary_assigned
  AFTER UPDATE OF assigned_notary_id ON public.submission
  FOR EACH ROW
  WHEN (OLD.assigned_notary_id IS DISTINCT FROM NEW.assigned_notary_id)
  EXECUTE FUNCTION public.notify_notary_assigned();


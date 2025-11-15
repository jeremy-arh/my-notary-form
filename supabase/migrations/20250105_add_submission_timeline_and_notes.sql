-- Migration: Add submission timeline and internal notes tables
-- This migration creates tables to track all actions on submissions and store internal notes

-- Table: submission_activity_log
-- Tracks all actions performed on a submission
CREATE TABLE IF NOT EXISTS submission_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- e.g., 'status_changed', 'notary_assigned', 'appointment_updated', 'note_added', etc.
  action_description TEXT NOT NULL,
  performed_by_type VARCHAR(50) NOT NULL CHECK (performed_by_type IN ('admin', 'notary', 'client', 'system')),
  performed_by_id UUID,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submission_activity_log_submission ON submission_activity_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_activity_log_created ON submission_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_activity_log_action ON submission_activity_log(action_type);

-- Table: submission_internal_notes
-- Stores internal notes (rich text) for submissions
CREATE TABLE IF NOT EXISTS submission_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- Rich text content (HTML/JSON)
  created_by_type VARCHAR(50) NOT NULL CHECK (created_by_type IN ('admin', 'notary')),
  created_by_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submission_internal_notes_submission ON submission_internal_notes(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_internal_notes_created ON submission_internal_notes(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_submission_internal_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_submission_internal_notes_updated_at ON submission_internal_notes;
CREATE TRIGGER update_submission_internal_notes_updated_at
    BEFORE UPDATE ON submission_internal_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_submission_internal_notes_updated_at();

-- RLS Policies (if RLS is enabled)
-- Allow admins to read/write activity logs
ALTER TABLE submission_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_internal_notes ENABLE ROW LEVEL SECURITY;

-- Policy for activity logs: admins can read all, notaries can read their assigned submissions
DROP POLICY IF EXISTS "Admins can read all activity logs" ON submission_activity_log;
CREATE POLICY "Admins can read all activity logs"
    ON submission_activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_user
            WHERE admin_user.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Notaries can read activity logs for their submissions" ON submission_activity_log;
CREATE POLICY "Notaries can read activity logs for their submissions"
    ON submission_activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM submission
            WHERE submission.id = submission_activity_log.submission_id
            AND submission.assigned_notary_id IN (
                SELECT id FROM notary WHERE user_id = auth.uid()
            )
        )
    );

-- Policy for internal notes: admins can read/write all, notaries can read/write their assigned submissions
DROP POLICY IF EXISTS "Admins can manage all internal notes" ON submission_internal_notes;
CREATE POLICY "Admins can manage all internal notes"
    ON submission_internal_notes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_user
            WHERE admin_user.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Notaries can manage internal notes for their submissions" ON submission_internal_notes;
CREATE POLICY "Notaries can manage internal notes for their submissions"
    ON submission_internal_notes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM submission
            WHERE submission.id = submission_internal_notes.submission_id
            AND submission.assigned_notary_id IN (
                SELECT id FROM notary WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- TRIGGERS TO AUTOMATICALLY LOG ALL ACTIONS ON SUBMISSIONS
-- ============================================================================

-- Function to log submission changes to activity log
CREATE OR REPLACE FUNCTION log_submission_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_type_val VARCHAR(100);
    action_desc TEXT;
    performed_by_type_val VARCHAR(50);
    performed_by_id_val UUID;
    old_val TEXT;
    new_val TEXT;
BEGIN
    -- Determine who performed the action
    -- Check if current user is admin
    IF EXISTS (SELECT 1 FROM admin_user WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'admin';
        SELECT id INTO performed_by_id_val FROM admin_user WHERE user_id = auth.uid() LIMIT 1;
    -- Check if current user is notary
    ELSIF EXISTS (SELECT 1 FROM notary WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'notary';
        SELECT id INTO performed_by_id_val FROM notary WHERE user_id = auth.uid() LIMIT 1;
    -- Check if current user is client
    ELSIF EXISTS (SELECT 1 FROM client WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'client';
        SELECT id INTO performed_by_id_val FROM client WHERE user_id = auth.uid() LIMIT 1;
    ELSE
        performed_by_type_val := 'system';
        performed_by_id_val := NULL;
    END IF;

    -- Log submission creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            old_value,
            new_value,
            metadata
        ) VALUES (
            NEW.id,
            'submission_created',
            'Submission created',
            COALESCE(performed_by_type_val, 'system'),
            performed_by_id_val,
            NULL,
            NEW.status,
            jsonb_build_object(
                'client_name', NEW.first_name || ' ' || NEW.last_name,
                'email', NEW.email,
                'appointment_date', NEW.appointment_date,
                'appointment_time', NEW.appointment_time
            )
        );
        RETURN NEW;
    END IF;

    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            'status_changed',
            'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status,
            COALESCE(performed_by_type_val, 'system'),
            performed_by_id_val,
            OLD.status,
            NEW.status
        );
    END IF;

    -- Log notary assignment changes
    IF OLD.assigned_notary_id IS DISTINCT FROM NEW.assigned_notary_id THEN
        IF NEW.assigned_notary_id IS NOT NULL THEN
            INSERT INTO submission_activity_log (
                submission_id,
                action_type,
                action_description,
                performed_by_type,
                performed_by_id,
                old_value,
                new_value,
                metadata
            ) VALUES (
                NEW.id,
                'notary_assigned',
                'Notary assigned',
                COALESCE(performed_by_type_val, 'system'),
                performed_by_id_val,
                OLD.assigned_notary_id::TEXT,
                NEW.assigned_notary_id::TEXT,
                jsonb_build_object('notary_id', NEW.assigned_notary_id)
            );
        ELSE
            INSERT INTO submission_activity_log (
                submission_id,
                action_type,
                action_description,
                performed_by_type,
                performed_by_id,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                'notary_unassigned',
                'Notary unassigned',
                COALESCE(performed_by_type_val, 'system'),
                performed_by_id_val,
                OLD.assigned_notary_id::TEXT,
                NULL
            );
        END IF;
    END IF;

    -- Log appointment changes
    IF (OLD.appointment_date IS DISTINCT FROM NEW.appointment_date) OR 
       (OLD.appointment_time IS DISTINCT FROM NEW.appointment_time) OR
       (OLD.timezone IS DISTINCT FROM NEW.timezone) THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            old_value,
            new_value,
            metadata
        ) VALUES (
            NEW.id,
            'appointment_updated',
            'Appointment updated',
            COALESCE(performed_by_type_val, 'system'),
            performed_by_id_val,
            COALESCE(OLD.appointment_date::TEXT, '') || ' ' || COALESCE(OLD.appointment_time::TEXT, '') || ' (' || COALESCE(OLD.timezone, '') || ')',
            COALESCE(NEW.appointment_date::TEXT, '') || ' ' || COALESCE(NEW.appointment_time::TEXT, '') || ' (' || COALESCE(NEW.timezone, '') || ')',
            jsonb_build_object(
                'old_date', OLD.appointment_date,
                'old_time', OLD.appointment_time,
                'old_timezone', OLD.timezone,
                'new_date', NEW.appointment_date,
                'new_time', NEW.appointment_time,
                'new_timezone', NEW.timezone
            )
        );
    END IF;

    -- Log price changes
    IF OLD.total_price IS DISTINCT FROM NEW.total_price THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            'price_updated',
            'Total price updated',
            COALESCE(performed_by_type_val, 'system'),
            performed_by_id_val,
            COALESCE(OLD.total_price::TEXT, '0'),
            COALESCE(NEW.total_price::TEXT, '0')
        );
    END IF;

    -- Log notary cost changes
    IF OLD.notary_cost IS DISTINCT FROM NEW.notary_cost THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            old_value,
            new_value
        ) VALUES (
            NEW.id,
            'notary_cost_updated',
            'Notary cost updated',
            COALESCE(performed_by_type_val, 'system'),
            performed_by_id_val,
            COALESCE(OLD.notary_cost::TEXT, '0'),
            COALESCE(NEW.notary_cost::TEXT, '0')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for submission changes (drop if exists first)
DROP TRIGGER IF EXISTS submission_changes_trigger ON submission;
CREATE TRIGGER submission_changes_trigger
    AFTER INSERT OR UPDATE ON submission
    FOR EACH ROW
    EXECUTE FUNCTION log_submission_changes();

-- Function to log file uploads/deletions
CREATE OR REPLACE FUNCTION log_submission_file_changes()
RETURNS TRIGGER AS $$
DECLARE
    performed_by_type_val VARCHAR(50);
    performed_by_id_val UUID;
BEGIN
    -- Determine who performed the action
    IF EXISTS (SELECT 1 FROM admin_user WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'admin';
        SELECT id INTO performed_by_id_val FROM admin_user WHERE user_id = auth.uid() LIMIT 1;
    ELSIF EXISTS (SELECT 1 FROM notary WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'notary';
        SELECT id INTO performed_by_id_val FROM notary WHERE user_id = auth.uid() LIMIT 1;
    ELSIF EXISTS (SELECT 1 FROM client WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'client';
        SELECT id INTO performed_by_id_val FROM client WHERE user_id = auth.uid() LIMIT 1;
    ELSE
        performed_by_type_val := 'system';
        performed_by_id_val := NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            metadata
        ) VALUES (
            NEW.submission_id,
            'file_uploaded',
            'File uploaded: ' || NEW.file_name,
            COALESCE(performed_by_type_val, 'system'),
            performed_by_id_val,
            jsonb_build_object(
                'file_name', NEW.file_name,
                'file_type', NEW.file_type,
                'file_size', NEW.file_size
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            metadata
        ) VALUES (
            OLD.submission_id,
            'file_deleted',
            'File deleted: ' || OLD.file_name,
            COALESCE(performed_by_type_val, 'system'),
            performed_by_id_val,
            jsonb_build_object('file_name', OLD.file_name)
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for file changes (drop if exists first)
DROP TRIGGER IF EXISTS submission_file_changes_trigger ON submission_files;
CREATE TRIGGER submission_file_changes_trigger
    AFTER INSERT OR DELETE ON submission_files
    FOR EACH ROW
    EXECUTE FUNCTION log_submission_file_changes();

-- Function to log payment status changes (from data JSONB)
CREATE OR REPLACE FUNCTION log_payment_status_changes()
RETURNS TRIGGER AS $$
DECLARE
    performed_by_type_val VARCHAR(50);
    performed_by_id_val UUID;
    old_payment_status TEXT;
    new_payment_status TEXT;
BEGIN
    -- Determine who performed the action
    IF EXISTS (SELECT 1 FROM admin_user WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'admin';
        SELECT id INTO performed_by_id_val FROM admin_user WHERE user_id = auth.uid() LIMIT 1;
    ELSIF EXISTS (SELECT 1 FROM notary WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'notary';
        SELECT id INTO performed_by_id_val FROM notary WHERE user_id = auth.uid() LIMIT 1;
    ELSIF EXISTS (SELECT 1 FROM client WHERE user_id = auth.uid()) THEN
        performed_by_type_val := 'client';
        SELECT id INTO performed_by_id_val FROM client WHERE user_id = auth.uid() LIMIT 1;
    ELSE
        performed_by_type_val := 'system';
        performed_by_id_val := NULL;
    END IF;

    -- Extract payment status from data JSONB
    old_payment_status := COALESCE((OLD.data->'payment'->>'payment_status'), '');
    new_payment_status := COALESCE((NEW.data->'payment'->>'payment_status'), '');

    -- Log payment status changes
    IF old_payment_status IS DISTINCT FROM new_payment_status AND new_payment_status != '' THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            old_value,
            new_value,
            metadata
        ) VALUES (
            NEW.id,
            'payment_status_changed',
            'Payment status changed to ' || new_payment_status,
            COALESCE(performed_by_type_val, 'system'),
            performed_by_id_val,
            old_payment_status,
            new_payment_status,
            jsonb_build_object(
                'payment_intent_id', NEW.data->'payment'->>'payment_intent_id',
                'amount', NEW.data->'payment'->>'amount'
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment status changes (drop if exists first)
DROP TRIGGER IF EXISTS payment_status_changes_trigger ON submission;
CREATE TRIGGER payment_status_changes_trigger
    AFTER UPDATE OF data ON submission
    FOR EACH ROW
    WHEN (OLD.data IS DISTINCT FROM NEW.data)
    EXECUTE FUNCTION log_payment_status_changes();

-- Function to log messages
CREATE OR REPLACE FUNCTION log_message_activity()
RETURNS TRIGGER AS $$
DECLARE
    performed_by_type_val VARCHAR(50);
    performed_by_id_val UUID;
BEGIN
    -- Use the sender_type and sender_id from the message
    performed_by_type_val := NEW.sender_type;
    performed_by_id_val := NEW.sender_id;

    -- Only log if it's a new message (not updates)
    IF TG_OP = 'INSERT' THEN
        INSERT INTO submission_activity_log (
            submission_id,
            action_type,
            action_description,
            performed_by_type,
            performed_by_id,
            metadata
        ) VALUES (
            NEW.submission_id,
            'message_sent',
            'Message sent',
            NEW.sender_type,
            NEW.sender_id,
            jsonb_build_object(
                'message_preview', LEFT(NEW.content, 100),
                'has_attachments', CASE WHEN NEW.attachments IS NOT NULL THEN true ELSE false END
            )
        );
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for messages (drop if exists first)
DROP TRIGGER IF EXISTS message_activity_trigger ON message;
CREATE TRIGGER message_activity_trigger
    AFTER INSERT ON message
    FOR EACH ROW
    EXECUTE FUNCTION log_message_activity();


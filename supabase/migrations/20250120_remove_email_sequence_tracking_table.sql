-- Remove email_sequence_tracking table - all email tracking is now done via email_sent and email_events
-- This migration removes the redundant email_sequence_tracking table

-- Drop indexes first
DROP INDEX IF EXISTS idx_email_sequence_form_draft_id;
DROP INDEX IF EXISTS idx_email_sequence_submission_id;
DROP INDEX IF EXISTS idx_email_sequence_email;
DROP INDEX IF EXISTS idx_email_sequence_step;
DROP INDEX IF EXISTS idx_email_sequence_sent_at;
DROP INDEX IF EXISTS idx_email_sequence_opened_at;
DROP INDEX IF EXISTS idx_email_sequence_clicked_at;

-- Drop the table (cascade will handle foreign keys)
DROP TABLE IF EXISTS email_sequence_tracking CASCADE;

-- Add comment
COMMENT ON TABLE email_sent IS 'Tracks ALL emails sent through the system (transactional, abandoned cart sequences, notifications, etc.) - single source of truth for all sent emails';
COMMENT ON TABLE email_events IS 'Stores detailed SendGrid events for all emails (opens, clicks, bounces, etc.) - provides enriched event data';

-- Update email_sequence_tracking to support submissions instead of form_draft
-- This migration assumes the table already exists (created by 20250107_create_email_sequence_tracking_complete.sql)
-- If the table doesn't exist, it will be created by the complete migration

-- Add submission_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_sequence_tracking' 
    AND column_name = 'submission_id'
  ) THEN
    ALTER TABLE email_sequence_tracking 
    ADD COLUMN submission_id UUID REFERENCES submission(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make form_draft_id nullable if it's not already (for backward compatibility)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_sequence_tracking' 
    AND column_name = 'form_draft_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE email_sequence_tracking 
    ALTER COLUMN form_draft_id DROP NOT NULL;
  END IF;
END $$;

-- Add constraint to ensure at least one reference exists (if constraint doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_sequence_tracking_reference_check'
  ) THEN
    ALTER TABLE email_sequence_tracking
    ADD CONSTRAINT email_sequence_tracking_reference_check CHECK (
      (form_draft_id IS NOT NULL) OR (submission_id IS NOT NULL)
    );
  END IF;
END $$;

-- Create index for submission_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_email_sequence_submission_id ON email_sequence_tracking(submission_id);

-- Update comments
COMMENT ON TABLE email_sequence_tracking IS 'Tracks which abandoned cart emails have been sent to which submissions or form_draft entries';
COMMENT ON COLUMN email_sequence_tracking.submission_id IS 'Reference to submission (new approach)';
COMMENT ON COLUMN email_sequence_tracking.form_draft_id IS 'Reference to form_draft (legacy, kept for backward compatibility)';

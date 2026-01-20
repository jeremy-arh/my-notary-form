-- Create email_sequence_tracking table if it doesn't exist
-- Support both form_draft_id (legacy) and submission_id (new approach)
-- This migration works even if form_draft table doesn't exist

DO $$ 
BEGIN
  -- Create table only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'email_sequence_tracking'
  ) THEN
    -- Check if form_draft table exists to create foreign key
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'form_draft'
    ) THEN
      -- Create with form_draft reference
      CREATE TABLE email_sequence_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_draft_id UUID REFERENCES form_draft(id) ON DELETE CASCADE,
        submission_id UUID REFERENCES submission(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        sequence_step TEXT NOT NULL,
        email_subject TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT email_sequence_tracking_reference_check CHECK (
          (form_draft_id IS NOT NULL) OR (submission_id IS NOT NULL)
        )
      );
    ELSE
      -- Create without form_draft reference (form_draft doesn't exist)
      CREATE TABLE email_sequence_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_draft_id UUID, -- No foreign key if form_draft doesn't exist
        submission_id UUID REFERENCES submission(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        sequence_step TEXT NOT NULL,
        email_subject TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT email_sequence_tracking_reference_check CHECK (
          (form_draft_id IS NOT NULL) OR (submission_id IS NOT NULL)
        )
      );
    END IF;
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_sequence_form_draft_id ON email_sequence_tracking(form_draft_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_submission_id ON email_sequence_tracking(submission_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_email ON email_sequence_tracking(email);
CREATE INDEX IF NOT EXISTS idx_email_sequence_step ON email_sequence_tracking(sequence_step);
CREATE INDEX IF NOT EXISTS idx_email_sequence_sent_at ON email_sequence_tracking(sent_at DESC);

-- Add comments
COMMENT ON TABLE email_sequence_tracking IS 'Tracks which abandoned cart emails have been sent to which submissions or form_draft entries';
COMMENT ON COLUMN email_sequence_tracking.form_draft_id IS 'Reference to form_draft (legacy, kept for backward compatibility)';
COMMENT ON COLUMN email_sequence_tracking.submission_id IS 'Reference to submission (new approach)';
COMMENT ON COLUMN email_sequence_tracking.sequence_step IS 'The step in the email sequence: h+1 (1 hour), j+1 (1 day), j+3 (3 days), j+7 (7 days), j+10 (10 days), j+15 (15 days), j+30 (30 days)';

-- Enable Row Level Security
ALTER TABLE email_sequence_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Service role can manage all email sequence tracking" ON email_sequence_tracking;
CREATE POLICY "Service role can manage all email sequence tracking"
  ON email_sequence_tracking
  FOR ALL
  USING (auth.role() = 'service_role');

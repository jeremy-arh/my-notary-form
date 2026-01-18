-- Create table to track abandoned cart email sequences
-- This table tracks which emails have been sent to which form_draft entries

CREATE TABLE IF NOT EXISTS email_sequence_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_draft_id UUID NOT NULL REFERENCES form_draft(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  sequence_step TEXT NOT NULL, -- 'h+1', 'j+1', 'j+3', 'j+7', 'j+10', 'j+15', 'j+30'
  email_subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_sequence_form_draft_id ON email_sequence_tracking(form_draft_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_email ON email_sequence_tracking(email);
CREATE INDEX IF NOT EXISTS idx_email_sequence_step ON email_sequence_tracking(sequence_step);
CREATE INDEX IF NOT EXISTS idx_email_sequence_sent_at ON email_sequence_tracking(sent_at DESC);

-- Add comments
COMMENT ON TABLE email_sequence_tracking IS 'Tracks which abandoned cart emails have been sent to which form_draft entries';
COMMENT ON COLUMN email_sequence_tracking.sequence_step IS 'The step in the email sequence: h+1 (1 hour), j+1 (1 day), j+3 (3 days), j+7 (7 days), j+10 (10 days), j+15 (15 days), j+30 (30 days)';

-- Enable Row Level Security
ALTER TABLE email_sequence_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage all records
CREATE POLICY "Service role can manage all email sequence tracking"
  ON email_sequence_tracking
  FOR ALL
  USING (auth.role() = 'service_role');

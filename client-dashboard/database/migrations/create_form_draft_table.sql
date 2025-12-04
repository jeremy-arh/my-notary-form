-- Create form_draft table to store form data drafts
-- This table allows saving form progress in the database in addition to localStorage

CREATE TABLE IF NOT EXISTS form_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  session_id TEXT,
  form_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_draft_email ON form_draft(email);
CREATE INDEX IF NOT EXISTS idx_form_draft_session_id ON form_draft(session_id);
CREATE INDEX IF NOT EXISTS idx_form_draft_updated_at ON form_draft(updated_at DESC);

-- Add comment to table
COMMENT ON TABLE form_draft IS 'Stores draft form data for users filling out the notarization form';
COMMENT ON COLUMN form_draft.email IS 'User email if available (for authenticated users)';
COMMENT ON COLUMN form_draft.session_id IS 'Session ID for anonymous users';
COMMENT ON COLUMN form_draft.form_data IS 'JSON object containing all form data';

-- Enable Row Level Security (RLS)
ALTER TABLE form_draft ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert/update their own drafts
-- Users can only access drafts with their email or session_id
CREATE POLICY "Users can insert their own drafts"
  ON form_draft
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own drafts"
  ON form_draft
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can read their own drafts"
  ON form_draft
  FOR SELECT
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_form_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_form_draft_updated_at
  BEFORE UPDATE ON form_draft
  FOR EACH ROW
  EXECUTE FUNCTION update_form_draft_updated_at();



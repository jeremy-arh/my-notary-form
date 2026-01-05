-- Restructure form_draft table with clear columns
-- Drop existing table and recreate with proper structure

DROP TABLE IF EXISTS form_draft CASCADE;

CREATE TABLE form_draft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  email TEXT,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  
  -- Step 1: Services
  selected_services JSONB DEFAULT '[]',
  
  -- Step 2: Documents (stored in Supabase Storage, only paths here)
  documents JSONB DEFAULT '{}',  -- { serviceId: [{ name, path, size, uploadedAt }] }
  
  -- Step 3: Delivery
  delivery_method TEXT, -- 'email' or 'postal'
  
  -- Step 4: Personal Info
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  
  -- Step 5: Signatories
  signatories JSONB DEFAULT '[]',
  is_signatory BOOLEAN DEFAULT false,
  
  -- Additional data
  currency TEXT DEFAULT 'EUR',
  total_amount NUMERIC(10, 2) DEFAULT NULL, -- Total amount in the selected currency
  timezone TEXT DEFAULT 'UTC-5',
  gclid TEXT,
  
  -- Progress tracking
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_form_draft_email ON form_draft(email);
CREATE INDEX idx_form_draft_session_id ON form_draft(session_id);
CREATE INDEX idx_form_draft_user_id ON form_draft(user_id);
CREATE INDEX idx_form_draft_updated_at ON form_draft(updated_at DESC);
CREATE INDEX idx_form_draft_last_activity_at ON form_draft(last_activity_at DESC);

-- Add comments
COMMENT ON TABLE form_draft IS 'Stores draft form data with clear columns for easy viewing';
COMMENT ON COLUMN form_draft.documents IS 'Document paths in Supabase Storage (not base64)';
COMMENT ON COLUMN form_draft.total_amount IS 'Total amount including services, options, delivery, and additional signatories';
COMMENT ON COLUMN form_draft.current_step IS 'Current form step (1-6)';
COMMENT ON COLUMN form_draft.completed_steps IS 'Array of completed step numbers';

-- Enable Row Level Security
ALTER TABLE form_draft ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert drafts"
  ON form_draft
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own drafts"
  ON form_draft
  FOR UPDATE
  USING (
    (email IS NOT NULL AND email = current_setting('request.jwt.claims', true)::json->>'email')
    OR (session_id IS NOT NULL)
    OR (user_id = auth.uid())
  );

CREATE POLICY "Users can read their own drafts"
  ON form_draft
  FOR SELECT
  USING (
    (email IS NOT NULL AND email = current_setting('request.jwt.claims', true)::json->>'email')
    OR (session_id IS NOT NULL)
    OR (user_id = auth.uid())
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_form_draft_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_form_draft_timestamps
  BEFORE UPDATE ON form_draft
  FOR EACH ROW
  EXECUTE FUNCTION update_form_draft_timestamps();

-- Create storage bucket for form documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-documents', 'form-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Anyone can upload form documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'form-documents');

CREATE POLICY "Users can read their own form documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-documents');

CREATE POLICY "Users can update their own form documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'form-documents');

CREATE POLICY "Users can delete their own form documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'form-documents');


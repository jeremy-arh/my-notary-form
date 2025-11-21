-- Create signatories table for storing signatory information per document
CREATE TABLE IF NOT EXISTS signatories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  document_key VARCHAR(255) NOT NULL, -- Format: "serviceId_docIndex"
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  birth_city VARCHAR(255) NOT NULL,
  postal_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_signatories_submission ON signatories(submission_id);
CREATE INDEX IF NOT EXISTS idx_signatories_document_key ON signatories(document_key);

-- Create trigger for updated_at
CREATE TRIGGER update_signatories_updated_at BEFORE UPDATE ON signatories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE signatories IS 'Stores signatory information for each document in a submission';





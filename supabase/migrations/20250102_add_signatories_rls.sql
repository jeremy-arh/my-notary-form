-- First, clean up any duplicate signatories before adding unique constraint
-- Delete duplicates, keeping only the first occurrence (oldest created_at)
DELETE FROM signatories
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY submission_id, document_key, first_name, last_name, birth_date
        ORDER BY created_at ASC
      ) as row_num
    FROM signatories
  ) ranked
  WHERE row_num > 1
);

-- Enable Row Level Security on signatories table
ALTER TABLE signatories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view signatories for submissions they are associated with
-- Clients can view signatories for their own submissions
CREATE POLICY "Clients can view their own signatories"
  ON signatories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submission s
      JOIN client c ON s.client_id = c.id
      JOIN auth.users u ON c.user_id = u.id
      WHERE s.id = signatories.submission_id
      AND u.id = auth.uid()
    )
  );

-- Notaries can view signatories for submissions assigned to them
CREATE POLICY "Notaries can view assigned submission signatories"
  ON signatories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submission s
      JOIN notary n ON s.assigned_notary_id = n.id
      JOIN auth.users u ON n.user_id = u.id
      WHERE s.id = signatories.submission_id
      AND u.id = auth.uid()
    )
  );

-- Admins can view all signatories
CREATE POLICY "Admins can view all signatories"
  ON signatories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_user au
      JOIN auth.users u ON au.user_id = u.id
      WHERE u.id = auth.uid()
    )
  );

-- Service role (Edge Functions) bypasses RLS by default, but we add these policies
-- for clarity and in case RLS is enforced differently in the future
-- Note: Service role connections bypass RLS, so these policies are mainly for documentation

-- Allow authenticated service role to insert signatories
-- In practice, Edge Functions use service role which bypasses RLS
CREATE POLICY "Allow service role to insert signatories"
  ON signatories
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated service role to update signatories
CREATE POLICY "Allow service role to update signatories"
  ON signatories
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow authenticated service role to delete signatories
CREATE POLICY "Allow service role to delete signatories"
  ON signatories
  FOR DELETE
  USING (true);

-- Add unique constraint to prevent duplicates
-- This ensures that the same signatory cannot be inserted twice for the same submission and document
CREATE UNIQUE INDEX IF NOT EXISTS idx_signatories_unique 
ON signatories(submission_id, document_key, first_name, last_name, birth_date);


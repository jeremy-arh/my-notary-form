-- COMPLETE FIX for submission RLS policies
-- This ensures submissions can be created and updated by anonymous users

-- Enable RLS
ALTER TABLE submission ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow public insert on submission" ON submission;
DROP POLICY IF EXISTS "Allow public update on submission" ON submission;
DROP POLICY IF EXISTS "Allow users to view their own submissions" ON submission;
DROP POLICY IF EXISTS "Allow public read submissions" ON submission;
DROP POLICY IF EXISTS "Clients can view their own submissions" ON submission;
DROP POLICY IF EXISTS "Notaries can view all submissions" ON submission;
DROP POLICY IF EXISTS "Notaries can update submissions" ON submission;

-- CREATE INSERT POLICY - Allow anyone to insert
CREATE POLICY "Allow public insert on submission"
  ON submission FOR INSERT
  TO public
  WITH CHECK (true);

-- CREATE UPDATE POLICY - Allow anyone to update submissions with pending_payment status
CREATE POLICY "Allow public update on submission"
  ON submission FOR UPDATE
  TO public
  USING (status = 'pending_payment' OR status IS NULL)
  WITH CHECK (status = 'pending_payment' OR status IS NULL);

-- CREATE SELECT POLICY - Allow anyone to read submissions
CREATE POLICY "Allow public read submissions"
  ON submission FOR SELECT
  TO public
  USING (true);

-- Verify policies were created
SELECT 
    policyname,
    cmd as command,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'submission'
ORDER BY cmd, policyname;

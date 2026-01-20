-- Ensure submission table has proper RLS policies for INSERT and UPDATE
-- This allows anonymous users to create and update submissions during form completion

-- Enable RLS if not already enabled
ALTER TABLE submission ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public insert on submission" ON submission;
DROP POLICY IF EXISTS "Allow public update on submission" ON submission;
DROP POLICY IF EXISTS "Allow users to view their own submissions" ON submission;

-- Create policy for INSERT (allow anyone to create submissions)
CREATE POLICY "Allow public insert on submission"
  ON submission FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for UPDATE (allow anyone to update submissions with status 'pending_payment')
-- This allows updating the submission as the user progresses through the form
CREATE POLICY "Allow public update on submission"
  ON submission FOR UPDATE
  TO public
  USING (status = 'pending_payment')
  WITH CHECK (status = 'pending_payment');

-- Create policy for SELECT (allow anyone to read submissions)
-- This is needed to find existing submissions by session_id
CREATE POLICY "Allow public read submissions"
  ON submission FOR SELECT
  TO public
  USING (true);

-- Add comment
COMMENT ON POLICY "Allow public insert on submission" ON submission IS 'Allows anonymous users to create submissions during form completion';
COMMENT ON POLICY "Allow public update on submission" ON submission IS 'Allows anonymous users to update submissions with status pending_payment';
COMMENT ON POLICY "Allow public read submissions" ON submission IS 'Allows reading submissions to find existing ones by session_id';

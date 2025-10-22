-- Migration script for admin features
-- Add user_id and additional columns to notary table

-- Add new columns to notary table
ALTER TABLE notary ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS postal_code VARCHAR(50);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE notary ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE notary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create unique constraint on user_id
ALTER TABLE notary ADD CONSTRAINT notary_user_id_unique UNIQUE (user_id);

-- Update submission table to add status if not exists
ALTER TABLE submission ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Create index on submission status for better query performance
CREATE INDEX IF NOT EXISTS submission_status_idx ON submission(status);
CREATE INDEX IF NOT EXISTS submission_created_at_idx ON submission(created_at DESC);

-- Enable RLS for notary table
ALTER TABLE notary ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read their own profile
CREATE POLICY "Users can view their own profile"
ON notary FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON notary FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
ON notary FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Allow authenticated notaries to view all submissions
CREATE POLICY "Notaries can view all submissions"
ON submission FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated notaries to update submissions
CREATE POLICY "Notaries can update submissions"
ON submission FOR UPDATE
TO authenticated
USING (true);

-- Update existing submissions to have pending status if null
UPDATE submission SET status = 'pending' WHERE status IS NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for notary table
DROP TRIGGER IF EXISTS update_notary_updated_at ON notary;
CREATE TRIGGER update_notary_updated_at
    BEFORE UPDATE ON notary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for submission table
DROP TRIGGER IF EXISTS update_submission_updated_at ON submission;
CREATE TRIGGER update_submission_updated_at
    BEFORE UPDATE ON submission
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add email and phone columns to signatories table
ALTER TABLE signatories
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add comment
COMMENT ON COLUMN signatories.email IS 'Email address of the signatory';
COMMENT ON COLUMN signatories.phone IS 'Phone number of the signatory (formatted with country code)';





-- Make submission fields nullable to allow creating submissions before all data is filled
-- This allows tracking form progression from step 1

-- Make appointment fields nullable (will be set later)
ALTER TABLE submission 
ALTER COLUMN appointment_date DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN appointment_time DROP NOT NULL;

-- Make personal info fields nullable (will be filled at step 4)
ALTER TABLE submission 
ALTER COLUMN first_name DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN last_name DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN address DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN city DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN postal_code DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN country DROP NOT NULL;

-- Make timezone nullable (will use default if not provided)
ALTER TABLE submission 
ALTER COLUMN timezone DROP NOT NULL;

-- Set default timezone if null
UPDATE submission SET timezone = 'UTC' WHERE timezone IS NULL;

-- Add default value for timezone
ALTER TABLE submission 
ALTER COLUMN timezone SET DEFAULT 'UTC';

-- Add comments
COMMENT ON COLUMN submission.appointment_date IS 'Appointment date (set later, nullable for pending submissions)';
COMMENT ON COLUMN submission.appointment_time IS 'Appointment time (set later, nullable for pending submissions)';
COMMENT ON COLUMN submission.first_name IS 'First name (filled at step 4, nullable before)';
COMMENT ON COLUMN submission.last_name IS 'Last name (filled at step 4, nullable before)';
COMMENT ON COLUMN submission.email IS 'Email (filled at step 4, nullable before)';
COMMENT ON COLUMN submission.phone IS 'Phone (filled at step 4, nullable before)';

-- Migration script to add timezone column to notary table
-- Run this SQL in your Supabase SQL Editor

-- Add timezone column to notary table
ALTER TABLE notary ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

-- Add comment to explain the column
COMMENT ON COLUMN notary.timezone IS 'IANA timezone identifier (e.g., Europe/Paris, America/New_York) for the notary location';


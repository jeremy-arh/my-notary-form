-- ============================================================================
-- ADD ADDRESS COLUMNS TO CLIENT TABLE
-- ============================================================================
-- This script adds address-related columns to the client table
-- Run this if you get the error: "Could not find the 'address' column of 'client'"
-- ============================================================================

-- Add address columns to client table
ALTER TABLE client ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS country TEXT;

-- Verify columns were added
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'client'
ORDER BY ordinal_position;

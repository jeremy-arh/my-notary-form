-- Migration: Remove appointment and notary-related columns from submission table
-- This removes appointment_date, appointment_time, timezone, and assigned_notary_id columns

-- Drop indexes related to appointment and notary
DROP INDEX IF EXISTS idx_submission_date;
DROP INDEX IF EXISTS idx_submission_notary;

-- Drop foreign key constraint for assigned_notary_id
ALTER TABLE public.submission
DROP CONSTRAINT IF EXISTS submission_assigned_notary_id_fkey;

-- Remove columns
ALTER TABLE public.submission
DROP COLUMN IF EXISTS appointment_date,
DROP COLUMN IF EXISTS appointment_time,
DROP COLUMN IF EXISTS timezone,
DROP COLUMN IF EXISTS assigned_notary_id;

-- Add comment
COMMENT ON TABLE public.submission IS 'Stores form submissions without appointment scheduling';

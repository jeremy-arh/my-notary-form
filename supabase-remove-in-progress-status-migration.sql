-- Migration: Remove 'in_progress' status from submission table
-- This migration removes the 'in_progress' status from the submission status check constraint

-- Drop the existing constraint
ALTER TABLE public.submission
DROP CONSTRAINT IF EXISTS submission_status_check;

-- Add the new constraint without 'in_progress'
ALTER TABLE public.submission
ADD CONSTRAINT submission_status_check CHECK (
  status::text = ANY (ARRAY[
    'pending'::character varying,
    'pending_payment'::character varying,
    'confirmed'::character varying,
    'completed'::character varying,
    'cancelled'::character varying
  ]::text[])
);

-- Update comment
COMMENT ON COLUMN public.submission.status IS 'Submission status: pending_payment (awaiting payment), pending (paid, awaiting review), confirmed, completed, cancelled';


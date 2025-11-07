-- Migration: Add notary_cost field to submission table
-- This allows tracking the cost paid to the notary for each submission

-- Add notary_cost column to submission table
ALTER TABLE public.submission
ADD COLUMN IF NOT EXISTS notary_cost NUMERIC(10, 2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.submission.notary_cost IS 'Cost paid to the assigned notary for this submission';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_submission_notary_cost ON public.submission(notary_cost);

-- Update notary_payments table to use notary_id instead of just notary_name
-- First, add notary_id column if it doesn't exist
ALTER TABLE public.notary_payments
ADD COLUMN IF NOT EXISTS notary_id UUID REFERENCES public.notary(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_notary_payments_notary_id ON public.notary_payments(notary_id);

-- Migrate existing data: try to match notary_name to notary.full_name
UPDATE public.notary_payments np
SET notary_id = n.id
FROM public.notary n
WHERE np.notary_name = n.full_name
AND np.notary_id IS NULL;


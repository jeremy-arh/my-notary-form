-- Add data column to submission table for storing form data and payment info
-- This column will store all additional information as JSON

-- Add data column if it doesn't exist
ALTER TABLE public.submission
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.submission.data IS 'Stores form data, selected options, documents info, payment details, and other metadata as JSON';

-- Create index on data column for better query performance
CREATE INDEX IF NOT EXISTS idx_submission_data ON public.submission USING GIN (data);

-- Create index on payment status within data for quick filtering of paid submissions
CREATE INDEX IF NOT EXISTS idx_submission_payment_status ON public.submission
USING BTREE ((data->'payment'->>'payment_status'));

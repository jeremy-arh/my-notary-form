-- FORCE ADD funnel_status column to submission table
-- This migration ensures the column exists even if previous migrations failed

-- Drop constraint if exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.submission'::regclass 
    AND conname LIKE '%funnel_status%'
  ) THEN
    ALTER TABLE submission DROP CONSTRAINT submission_funnel_status_check;
  END IF;
END $$;

-- Add column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submission' 
    AND column_name = 'funnel_status'
  ) THEN
    ALTER TABLE submission ADD COLUMN funnel_status TEXT;
    RAISE NOTICE 'Column funnel_status added to submission table';
  ELSE
    RAISE NOTICE 'Column funnel_status already exists';
  END IF;
END $$;

-- Add constraint (allows NULL for backward compatibility)
ALTER TABLE submission 
DROP CONSTRAINT IF EXISTS submission_funnel_status_check;

ALTER TABLE submission 
ADD CONSTRAINT submission_funnel_status_check CHECK (
  funnel_status IS NULL OR funnel_status IN (
    'started',
    'services_selected',
    'documents_uploaded',
    'delivery_method_selected',
    'personal_info_completed',
    'signatories_added',
    'payment_pending',
    'payment_completed',
    'submission_completed'
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_submission_funnel_status ON submission(funnel_status);

-- Verify column exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'submission'
AND column_name = 'funnel_status';

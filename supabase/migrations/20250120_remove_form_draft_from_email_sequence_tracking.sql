-- Remove all form_draft references from email_sequence_tracking table
-- This migration removes form_draft_id column, indexes, and constraints
-- Only submission_id will be used going forward

-- Drop the constraint that allows either form_draft_id or submission_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_sequence_tracking_reference_check'
  ) THEN
    ALTER TABLE email_sequence_tracking
    DROP CONSTRAINT email_sequence_tracking_reference_check;
  END IF;
END $$;

-- Drop the index on form_draft_id
DROP INDEX IF EXISTS idx_email_sequence_form_draft_id;

-- Drop the foreign key constraint on form_draft_id if it exists
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find foreign key constraints related to form_draft
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'email_sequence_tracking'::regclass
  AND contype = 'f'
  AND (
    conname LIKE '%form_draft%' 
    OR conname LIKE '%email_sequence%form_draft%'
  )
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE email_sequence_tracking DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- Remove the form_draft_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_sequence_tracking' 
    AND column_name = 'form_draft_id'
  ) THEN
    ALTER TABLE email_sequence_tracking 
    DROP COLUMN form_draft_id;
  END IF;
END $$;

-- Add constraint to ensure submission_id is required
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_sequence_tracking_submission_id_required'
  ) THEN
    ALTER TABLE email_sequence_tracking
    ADD CONSTRAINT email_sequence_tracking_submission_id_required 
    CHECK (submission_id IS NOT NULL);
  END IF;
END $$;

-- Make submission_id NOT NULL if it's not already
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_sequence_tracking' 
    AND column_name = 'submission_id'
    AND is_nullable = 'YES'
  ) THEN
    -- First, delete any rows without submission_id (they shouldn't exist, but just in case)
    DELETE FROM email_sequence_tracking WHERE submission_id IS NULL;
    
    -- Then make the column NOT NULL
    ALTER TABLE email_sequence_tracking 
    ALTER COLUMN submission_id SET NOT NULL;
  END IF;
END $$;

-- Update comments
COMMENT ON TABLE email_sequence_tracking IS 'Tracks which abandoned cart emails have been sent to which submissions';
COMMENT ON COLUMN email_sequence_tracking.submission_id IS 'Reference to submission - required for all email sequence tracking';

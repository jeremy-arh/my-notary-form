-- ============================================================================
-- REMOVE signatories_added FROM FUNNEL_STATUS
-- ============================================================================
-- The signatories step has been removed from the form, so we need to:
-- 1. Remove 'signatories_added' from CHECK constraints
-- 2. Update any existing submissions with 'signatories_added' to 'personal_info_completed'
-- ============================================================================

-- Step 1: Update existing submissions with 'signatories_added' status
UPDATE submission
SET funnel_status = 'personal_info_completed'
WHERE funnel_status = 'signatories_added';

-- Step 2: Drop existing CHECK constraints
ALTER TABLE submission DROP CONSTRAINT IF EXISTS submission_funnel_status_check;

-- Step 3: Create new CHECK constraint without 'signatories_added'
ALTER TABLE submission 
ADD CONSTRAINT submission_funnel_status_check CHECK (
  funnel_status IS NULL OR funnel_status IN (
    'started',
    'services_selected',
    'documents_uploaded',
    'delivery_method_selected',
    'personal_info_completed',
    'payment_pending',
    'payment_completed',
    'submission_completed'
  )
);

-- Step 4: Verify the constraint
SELECT 
    'Constraint updated' as status,
    COUNT(*) as submissions_with_signatories_added
FROM submission
WHERE funnel_status = 'signatories_added';

-- Should return 0 if update was successful

-- Step 5: Show current funnel_status distribution
SELECT 
    funnel_status,
    COUNT(*) as count
FROM submission
GROUP BY funnel_status
ORDER BY count DESC;

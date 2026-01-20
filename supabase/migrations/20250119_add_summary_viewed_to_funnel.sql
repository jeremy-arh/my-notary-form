-- ============================================================================
-- ADD summary_viewed TO FUNNEL_STATUS
-- ============================================================================
-- Add 'summary_viewed' status to track when user views the Summary page
-- This status is between 'personal_info_completed' and 'payment_pending'
-- ============================================================================

-- Step 1: Drop existing CHECK constraint
ALTER TABLE submission DROP CONSTRAINT IF EXISTS submission_funnel_status_check;

-- Step 2: Create new CHECK constraint with 'summary_viewed'
ALTER TABLE submission 
ADD CONSTRAINT submission_funnel_status_check CHECK (
  funnel_status IS NULL OR funnel_status IN (
    'started',
    'services_selected',
    'documents_uploaded',
    'delivery_method_selected',
    'personal_info_completed',
    'summary_viewed',
    'payment_pending',
    'payment_completed',
    'submission_completed'
  )
);

-- Step 3: Verify the constraint
SELECT 
    'Constraint updated with summary_viewed' as status,
    COUNT(*) as total_submissions
FROM submission;

-- Step 4: Show current funnel_status distribution
SELECT 
    funnel_status,
    COUNT(*) as count
FROM submission
GROUP BY funnel_status
ORDER BY count DESC;

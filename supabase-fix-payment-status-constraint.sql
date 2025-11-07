-- Fix: Update payment_status constraint to use new status values
-- This script fixes the constraint that is blocking 'paid' status
-- Execute this in Supabase SQL Editor

-- Step 1: Drop the existing constraint
ALTER TABLE public.notary_payments
DROP CONSTRAINT IF EXISTS notary_payments_payment_status_check;

-- Step 2: Update ALL existing values to match new status values
-- This handles all possible old status values
UPDATE public.notary_payments
SET payment_status = CASE
  WHEN payment_status = 'pending' THEN 'created'
  WHEN payment_status = 'completed' THEN 'paid'
  WHEN payment_status = 'cancelled' OR payment_status = 'canceled' THEN 'canceled'
  WHEN payment_status = 'processing' THEN 'created'
  WHEN payment_status = 'failed' THEN 'canceled'
  WHEN payment_status IS NULL THEN 'created'
  WHEN payment_status NOT IN ('created', 'paid', 'canceled') THEN 'created'
  ELSE payment_status
END;

-- Step 3: Ensure all NULL values are set to 'created'
UPDATE public.notary_payments
SET payment_status = 'created'
WHERE payment_status IS NULL;

-- Step 4: Add the new constraint with correct status values
ALTER TABLE public.notary_payments
ADD CONSTRAINT notary_payments_payment_status_check 
CHECK (payment_status IN ('created', 'paid', 'canceled'));

-- Step 5: Set default to 'created' if not already set
ALTER TABLE public.notary_payments
ALTER COLUMN payment_status SET DEFAULT 'created';

-- Step 6: Verify the constraint was created correctly
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.notary_payments'::regclass
AND conname = 'notary_payments_payment_status_check';

-- Step 7: Show current payment status distribution (for verification)
SELECT 
  payment_status,
  COUNT(*) as count
FROM public.notary_payments
GROUP BY payment_status
ORDER BY payment_status;

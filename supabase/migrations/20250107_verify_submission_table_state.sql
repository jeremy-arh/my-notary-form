-- Verify submission table state after migrations
-- This script checks if the migrations have been applied correctly

-- Check if columns are nullable
SELECT 
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'submission'
AND column_name IN (
    'appointment_date',
    'appointment_time',
    'timezone',
    'first_name',
    'last_name',
    'email',
    'phone',
    'address',
    'city',
    'postal_code',
    'country'
)
ORDER BY column_name;

-- Check if funnel_status column exists
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'submission'
AND column_name = 'funnel_status';

-- Check if status column accepts 'pending_payment'
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.submission'::regclass
AND conname LIKE '%status%';

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'submission'
ORDER BY cmd, policyname;

-- Check if data column exists (JSONB)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'submission'
AND column_name = 'data';

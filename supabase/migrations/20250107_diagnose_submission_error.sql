-- Diagnostic script to check why submission insert/update might be failing
-- Run this to see the current state of the submission table

-- 1. Check if columns are nullable
SELECT 
    'Column Nullability Check' as check_type,
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
    'country',
    'client_id',
    'status',
    'funnel_status'
)
ORDER BY column_name;

-- 2. Check if funnel_status column exists and its constraint
SELECT 
    'Funnel Status Check' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'submission'
AND column_name = 'funnel_status';

-- 3. Check status constraint
SELECT 
    'Status Constraint Check' as check_type,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.submission'::regclass
AND conname LIKE '%status%';

-- 4. Check RLS policies
SELECT 
    'RLS Policies Check' as check_type,
    policyname,
    cmd as command,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'submission'
ORDER BY cmd, policyname;

-- 5. Check if data column exists (JSONB)
SELECT 
    'Data Column Check' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'submission'
AND column_name = 'data';

-- 6. Test insert with minimal data (this will show the exact error)
-- Uncomment to test:
/*
INSERT INTO submission (
    status,
    funnel_status,
    phone,
    timezone,
    data
) VALUES (
    'pending_payment',
    'started',
    '',
    'UTC',
    '{"test": true}'::jsonb
) RETURNING id;
*/

-- Fix: Associate all submissions with their corresponding client_id based on email
-- This migration ensures all submissions are linked to their clients

-- ============================================================================
-- STEP 1: DIAGNOSTIC - Find submissions without client_id and their emails
-- ============================================================================
SELECT 
    'DIAGNOSTIC: Submissions without client_id' as info,
    id,
    email,
    LOWER(TRIM(email)) as normalized_email,
    created_at,
    status
FROM submission
WHERE client_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 2: DIAGNOSTIC - Find all client emails
-- ============================================================================
SELECT 
    'DIAGNOSTIC: All client emails' as info,
    id as client_id,
    email,
    LOWER(TRIM(email)) as normalized_email,
    first_name,
    last_name
FROM client
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 3: DIAGNOSTIC - Find submissions that should match but don't
-- ============================================================================
SELECT 
    'DIAGNOSTIC: Submissions that should match clients' as info,
    s.id as submission_id,
    s.email as submission_email,
    LOWER(TRIM(s.email)) as submission_normalized,
    c.id as client_id,
    c.email as client_email,
    LOWER(TRIM(c.email)) as client_normalized,
    s.client_id as current_client_id
FROM submission s
CROSS JOIN client c
WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(c.email))
  AND (s.client_id IS NULL OR s.client_id != c.id)
ORDER BY s.created_at DESC;

-- ============================================================================
-- STEP 4: UPDATE - Associate submissions with clients based on email
-- ============================================================================
UPDATE submission s
SET client_id = c.id
FROM client c
WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(c.email))
  AND (s.client_id IS NULL OR s.client_id != c.id);

-- ============================================================================
-- STEP 5: VERIFY - Check results
-- ============================================================================
-- Count submissions now linked to clients
SELECT 
    'VERIFY: Submissions linked to clients' as status,
    COUNT(*) as count
FROM submission s
INNER JOIN client c ON s.client_id = c.id
WHERE LOWER(TRIM(s.email)) = LOWER(TRIM(c.email));

-- Count remaining submissions without client_id
SELECT 
    'VERIFY: Submissions still without client_id' as status,
    COUNT(*) as count,
    STRING_AGG(DISTINCT email, ', ' ORDER BY email) as emails
FROM submission
WHERE client_id IS NULL;

-- ============================================================================
-- STEP 6: FINAL CHECK - Show all submissions with their client associations
-- ============================================================================
SELECT 
    s.id as submission_id,
    s.email as submission_email,
    s.client_id,
    c.email as client_email,
    CASE 
        WHEN s.client_id IS NULL THEN '❌ NOT ASSOCIATED'
        WHEN s.client_id IS NOT NULL AND c.id IS NULL THEN '⚠️ INVALID CLIENT_ID'
        WHEN LOWER(TRIM(s.email)) = LOWER(TRIM(c.email)) THEN '✅ CORRECTLY ASSOCIATED'
        ELSE '⚠️ EMAIL MISMATCH'
    END as association_status,
    s.created_at as submission_created_at
FROM submission s
LEFT JOIN client c ON s.client_id = c.id
ORDER BY s.created_at DESC
LIMIT 30;

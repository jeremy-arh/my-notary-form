-- ============================================================================
-- AUTO-ASSOCIATE CLIENT_ID TRIGGER
-- ============================================================================
-- This trigger automatically associates submissions with clients based on email
-- It runs on INSERT and UPDATE to ensure client_id is always set when possible
-- ============================================================================

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS auto_associate_client_id_trigger ON submission;
DROP FUNCTION IF EXISTS auto_associate_client_id();

-- Create function to auto-associate client_id based on email
CREATE OR REPLACE FUNCTION auto_associate_client_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_client_id UUID;
    normalized_email TEXT;
BEGIN
    -- Only process if email is provided and client_id is NULL or different
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RETURN NEW;
    END IF;

    -- Normalize email (lowercase and trim)
    normalized_email := LOWER(TRIM(NEW.email));

    -- Find client with matching email
    SELECT id INTO found_client_id
    FROM client
    WHERE LOWER(TRIM(email)) = normalized_email
    LIMIT 1;

    -- If client found and current client_id is NULL or different, update it
    IF found_client_id IS NOT NULL THEN
        IF NEW.client_id IS NULL OR NEW.client_id != found_client_id THEN
            NEW.client_id := found_client_id;
            RAISE NOTICE 'Auto-associated submission % with client_id % based on email %', NEW.id, found_client_id, normalized_email;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger that runs BEFORE INSERT and UPDATE
CREATE TRIGGER auto_associate_client_id_trigger
    BEFORE INSERT OR UPDATE ON submission
    FOR EACH ROW
    EXECUTE FUNCTION auto_associate_client_id();

-- Add comment
COMMENT ON FUNCTION auto_associate_client_id() IS 'Automatically associates submission with client based on matching email (case-insensitive)';
COMMENT ON TRIGGER auto_associate_client_id_trigger ON submission IS 'Triggers before INSERT/UPDATE to auto-associate client_id based on email';

-- ============================================================================
-- VERIFY TRIGGER WAS CREATED
-- ============================================================================
SELECT 
    'Trigger created successfully' as status,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'auto_associate_client_id_trigger';

-- ============================================================================
-- FUNCTION TO FIX EXISTING SUBMISSIONS WITHOUT CLIENT_ID
-- ============================================================================
-- This function can be called manually to fix existing submissions
CREATE OR REPLACE FUNCTION fix_existing_submission_client_ids()
RETURNS TABLE(
    submissions_updated INTEGER,
    submissions_checked INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_count INTEGER := 0;
    checked_count INTEGER := 0;
    submission_record RECORD;
    found_client_id UUID;
BEGIN
    -- Loop through all submissions without client_id
    FOR submission_record IN 
        SELECT id, email
        FROM submission
        WHERE client_id IS NULL 
          AND email IS NOT NULL 
          AND email != ''
    LOOP
        checked_count := checked_count + 1;
        
        -- Find matching client
        SELECT id INTO found_client_id
        FROM client
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(submission_record.email))
        LIMIT 1;
        
        -- Update submission if client found
        IF found_client_id IS NOT NULL THEN
            UPDATE submission
            SET client_id = found_client_id
            WHERE id = submission_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT updated_count, checked_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION fix_existing_submission_client_ids() IS 'Fixes existing submissions by associating them with clients based on email. Returns count of updated and checked submissions.';

-- ============================================================================
-- TEST THE TRIGGER (Optional - uncomment to test)
-- ============================================================================
-- Test with a sample submission (replace with actual test data)
-- INSERT INTO submission (email, status, first_name, last_name)
-- VALUES ('test@example.com', 'pending_payment', 'Test', 'User')
-- RETURNING id, email, client_id;

-- ============================================================================
-- RUN FIX FUNCTION ON EXISTING DATA (Optional - uncomment to execute)
-- ============================================================================
-- SELECT * FROM fix_existing_submission_client_ids();

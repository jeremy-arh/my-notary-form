-- Cleanup script to remove duplicate signatories
-- This script removes duplicates, keeping only the first occurrence (oldest created_at)

-- First, identify duplicates
-- Duplicates are defined as having the same submission_id, document_key, first_name, last_name, and birth_date

-- Delete duplicates, keeping only the oldest record (by created_at)
DELETE FROM signatories
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY submission_id, document_key, first_name, last_name, birth_date
        ORDER BY created_at ASC
      ) as row_num
    FROM signatories
  ) ranked
  WHERE row_num > 1
);

-- Verify cleanup
-- Run this query to check if duplicates still exist:
-- SELECT submission_id, document_key, first_name, last_name, birth_date, COUNT(*) as count
-- FROM signatories
-- GROUP BY submission_id, document_key, first_name, last_name, birth_date
-- HAVING COUNT(*) > 1;


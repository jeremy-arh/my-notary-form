-- Migration: Remove client ability to comment on notarized files
-- This script removes the RLS policy that allows clients to add comments
-- Clients should only be able to VIEW comments, not create them

-- Drop the policy that allows clients to add file comments
DROP POLICY IF EXISTS "Clients can add file comments" ON public.file_comments;

-- Verify that clients can still view comments (this policy should remain)
-- Policy "Clients can view file comments" should still exist


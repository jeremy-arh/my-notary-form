-- ============================================================================
-- FIX: Remove RLS infinite recursion
-- ============================================================================
-- Problem: Policies on admin_user table check admin_user itself, causing recursion
-- Solution: Use auth metadata or disable RLS for admin checks
-- ============================================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can read admin data" ON admin_user;
DROP POLICY IF EXISTS "Super admins can create admins" ON admin_user;
DROP POLICY IF EXISTS "Admins can read all client data" ON client;
DROP POLICY IF EXISTS "Admins can read all messages" ON message;
DROP POLICY IF EXISTS "Admins can send messages" ON message;

-- ============================================================================
-- OPTION 1: Create a security definer function to check admin role
-- This function bypasses RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_user
    WHERE user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_user
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$;

-- ============================================================================
-- OPTION 2: Disable RLS on admin_user (simpler but less secure)
-- Uncomment if you prefer this approach
-- ============================================================================
-- ALTER TABLE admin_user DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Recreate admin_user policies using the helper function
-- ============================================================================

-- Admins can read all admin data (using helper function to avoid recursion)
CREATE POLICY "Admins can read admin data"
  ON admin_user FOR SELECT
  USING (is_admin());

-- Only super admins can create new admins
CREATE POLICY "Super admins can create admins"
  ON admin_user FOR INSERT
  WITH CHECK (is_super_admin());

-- ============================================================================
-- Recreate client policies for admins
-- ============================================================================

CREATE POLICY "Admins can read all client data"
  ON client FOR SELECT
  USING (is_admin());

-- ============================================================================
-- Recreate message policies for admins
-- ============================================================================

CREATE POLICY "Admins can read all messages"
  ON message FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can send messages"
  ON message FOR INSERT
  WITH CHECK (
    is_admin() AND
    sender_type = 'admin' AND
    EXISTS (SELECT 1 FROM admin_user a WHERE a.id = sender_id)
  );

-- ============================================================================
-- Grant execute permissions on helper functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- ============================================================================
-- Verify policies
-- ============================================================================

-- List all policies to verify
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('admin_user', 'client', 'message')
ORDER BY tablename, policyname;

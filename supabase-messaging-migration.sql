-- ============================================================================
-- MIGRATION: Client Dashboard, Admin Dashboard & Messaging System
-- ============================================================================
-- This migration adds support for:
-- 1. Client accounts with magic link authentication
-- 2. Admin users for super admin functionality
-- 3. Internal messaging system between clients and notaries
-- 4. Manual notary assignment by admin
-- ============================================================================

-- ============================================================================
-- 1. CREATE CLIENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_client_user_id ON client(user_id);
CREATE INDEX IF NOT EXISTS idx_client_email ON client(email);

-- ============================================================================
-- 2. CREATE ADMIN USER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_admin_user_id ON admin_user(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_user(email);

-- ============================================================================
-- 3. CREATE MESSAGE TABLE (Internal Messaging System)
-- ============================================================================
CREATE TABLE IF NOT EXISTS message (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submission(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'notary', 'admin')),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_submission ON message(submission_id);
CREATE INDEX IF NOT EXISTS idx_message_sender ON message(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_message_read ON message(read);
CREATE INDEX IF NOT EXISTS idx_message_created ON message(created_at DESC);

-- ============================================================================
-- 4. MODIFY SUBMISSION TABLE
-- ============================================================================
-- Add client_id to submission table if not exists
-- Note: assigned_notary_id already exists and references notary(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE submission ADD COLUMN client_id UUID REFERENCES client(id);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submission_client ON submission(client_id);

-- ============================================================================
-- 5. HELPER FUNCTIONS FOR RLS (to avoid infinite recursion)
-- ============================================================================

-- Function to check if current user is an admin (bypasses RLS)
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

-- Function to check if current user is a super admin (bypasses RLS)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE client ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLIENT TABLE POLICIES
-- ============================================================================

-- Clients can read their own data
CREATE POLICY "Clients can read own data"
  ON client FOR SELECT
  USING (auth.uid() = user_id);

-- Clients can update their own data
CREATE POLICY "Clients can update own data"
  ON client FOR UPDATE
  USING (auth.uid() = user_id);

-- Anyone can insert (for registration during form submission)
CREATE POLICY "Anyone can create client account"
  ON client FOR INSERT
  WITH CHECK (true);

-- Notaries can read client data for their submissions
CREATE POLICY "Notaries can read client data for their submissions"
  ON client FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submission s
      INNER JOIN notary n ON n.id = s.assigned_notary_id
      WHERE s.client_id = client.id
      AND n.user_id = auth.uid()
    )
  );

-- Admins can read all client data (using helper function to avoid recursion)
CREATE POLICY "Admins can read all client data"
  ON client FOR SELECT
  USING (is_admin());

-- ============================================================================
-- ADMIN USER TABLE POLICIES
-- ============================================================================

-- Admins can read all admin data (using helper function to avoid recursion)
CREATE POLICY "Admins can read admin data"
  ON admin_user FOR SELECT
  USING (is_admin());

-- Only super admins can create new admins (using helper function to avoid recursion)
CREATE POLICY "Super admins can create admins"
  ON admin_user FOR INSERT
  WITH CHECK (is_super_admin());

-- ============================================================================
-- MESSAGE TABLE POLICIES
-- ============================================================================

-- Clients can read messages for their submissions
CREATE POLICY "Clients can read their messages"
  ON message FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submission s
      INNER JOIN client c ON c.id = s.client_id
      WHERE s.id = message.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Notaries can read messages for their submissions
CREATE POLICY "Notaries can read their messages"
  ON message FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submission s
      INNER JOIN notary n ON n.id = s.assigned_notary_id
      WHERE s.id = message.submission_id
      AND n.user_id = auth.uid()
    )
  );

-- Admins can read all messages (using helper function to avoid recursion)
CREATE POLICY "Admins can read all messages"
  ON message FOR SELECT
  USING (is_admin());

-- Clients can insert messages for their submissions
CREATE POLICY "Clients can send messages"
  ON message FOR INSERT
  WITH CHECK (
    sender_type = 'client' AND
    EXISTS (
      SELECT 1 FROM submission s
      INNER JOIN client c ON c.id = s.client_id
      WHERE s.id = message.submission_id
      AND c.user_id = auth.uid()
      AND c.id::text = sender_id::text
    )
  );

-- Notaries can insert messages for their submissions
CREATE POLICY "Notaries can send messages"
  ON message FOR INSERT
  WITH CHECK (
    sender_type = 'notary' AND
    EXISTS (
      SELECT 1 FROM submission s
      INNER JOIN notary n ON n.id = s.assigned_notary_id
      WHERE s.id = message.submission_id
      AND n.user_id = auth.uid()
      AND n.id::text = sender_id::text
    )
  );

-- Admins can insert messages (using helper function to avoid recursion)
CREATE POLICY "Admins can send messages"
  ON message FOR INSERT
  WITH CHECK (
    sender_type = 'admin' AND
    is_admin() AND
    EXISTS (
      SELECT 1 FROM admin_user a
      WHERE a.id::text = sender_id::text
      AND a.user_id = auth.uid()
    )
  );

-- Users can mark their messages as read
CREATE POLICY "Users can mark messages as read"
  ON message FOR UPDATE
  USING (
    -- Client can mark messages in their submissions as read
    EXISTS (
      SELECT 1 FROM submission s
      INNER JOIN client c ON c.id = s.client_id
      WHERE s.id = message.submission_id
      AND c.user_id = auth.uid()
    )
    OR
    -- Notary can mark messages in their submissions as read
    EXISTS (
      SELECT 1 FROM submission s
      INNER JOIN notary n ON n.id = s.assigned_notary_id
      WHERE s.id = message.submission_id
      AND n.user_id = auth.uid()
    )
    OR
    -- Admin can mark any message as read (using helper function to avoid recursion)
    is_admin()
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_client_updated_at ON client;
CREATE TRIGGER update_client_updated_at
  BEFORE UPDATE ON client
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_updated_at ON admin_user;
CREATE TRIGGER update_admin_updated_at
  BEFORE UPDATE ON admin_user
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  -- Check if user is a client
  IF EXISTS (SELECT 1 FROM client WHERE user_id = p_user_id) THEN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM message m
    INNER JOIN submission s ON s.id = m.submission_id
    INNER JOIN client c ON c.id = s.client_id
    WHERE c.user_id = p_user_id
    AND m.read = false
    AND m.sender_type != 'client';

  -- Check if user is a notary
  ELSIF EXISTS (SELECT 1 FROM notary WHERE user_id = p_user_id) THEN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM message m
    INNER JOIN submission s ON s.id = m.submission_id
    INNER JOIN notary n ON n.id = s.assigned_notary_id
    WHERE n.user_id = p_user_id
    AND m.read = false
    AND m.sender_type != 'notary';

  -- Check if user is an admin
  ELSIF EXISTS (SELECT 1 FROM admin_user WHERE user_id = p_user_id) THEN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM message m
    WHERE m.read = false
    AND m.sender_type != 'admin';

  ELSE
    unread_count := 0;
  END IF;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA (Optional - Create first admin user)
-- ============================================================================
-- Uncomment and modify with your admin email after creating the user in Supabase Auth

-- INSERT INTO admin_user (user_id, first_name, last_name, email, role)
-- VALUES (
--   'YOUR_USER_ID_FROM_SUPABASE_AUTH',
--   'Admin',
--   'User',
--   'admin@example.com',
--   'super_admin'
-- );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

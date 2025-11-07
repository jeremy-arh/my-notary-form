-- Migration pour ajouter les politiques RLS pour les tables services et options
-- Permet aux admins de gérer (CRUD) les services et options
-- À exécuter dans Supabase SQL Editor

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Allow authenticated users full access to services" ON services;
DROP POLICY IF EXISTS "Allow admins to manage services" ON services;
DROP POLICY IF EXISTS "Allow public read access to active services" ON services;
DROP POLICY IF EXISTS "Allow public read access to services" ON services;

-- Permettre la lecture publique des services actifs (pour le frontend)
CREATE POLICY "Allow public read access to active services" ON services
  FOR SELECT 
  USING (is_active = true);

-- Permettre à tous les utilisateurs authentifiés de gérer les services (INSERT, UPDATE, DELETE)
CREATE POLICY "Allow authenticated users full access to services" ON services
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- OPTIONS TABLE
-- ============================================================================

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Allow authenticated users full access to options" ON options;
DROP POLICY IF EXISTS "Allow admins to manage options" ON options;
DROP POLICY IF EXISTS "Allow public read access to options" ON options;

-- Permettre la lecture publique des options actives (pour le frontend)
CREATE POLICY "Allow public read access to active options" ON options
  FOR SELECT 
  USING (is_active = true);

-- Permettre à tous les utilisateurs authentifiés de gérer les options (INSERT, UPDATE, DELETE)
CREATE POLICY "Allow authenticated users full access to options" ON options
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Allow authenticated users full access to services" ON services IS 
  'Permet aux utilisateurs authentifiés de gérer (CRUD) les services';

COMMENT ON POLICY "Allow authenticated users full access to options" ON options IS 
  'Permet aux utilisateurs authentifiés de gérer (CRUD) les options';

-- ============================================================================
-- NOTE IMPORTANTE
-- ============================================================================
-- Ces politiques permettent à TOUS les utilisateurs authentifiés de gérer
-- les services et options. Si vous voulez restreindre aux admins uniquement,
-- vous devez avoir une table admin_user et utiliser cette politique à la place:
--
-- CREATE POLICY "Allow admins to manage services" ON services
--   FOR ALL 
--   USING (
--     EXISTS (
--       SELECT 1 FROM admin_user
--       WHERE user_id = auth.uid()
--     )
--   )
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM admin_user
--       WHERE user_id = auth.uid()
--     )
--   );
--
-- ============================================================================


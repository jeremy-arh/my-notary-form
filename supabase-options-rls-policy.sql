-- Migration pour ajouter les politiques RLS pour la table options
-- Permet aux admins de gérer (CRUD) les options
-- À exécuter dans Supabase SQL Editor

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Allow authenticated users full access to options" ON options;
DROP POLICY IF EXISTS "Allow admins to manage options" ON options;

-- Option 1: Permettre à tous les utilisateurs authentifiés de gérer les options
-- (Utilisez cette option si tous les utilisateurs authentifiés sont des admins)
CREATE POLICY "Allow authenticated users full access to options" ON options
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Option 2: Si vous avez une table admin_user, utilisez cette politique à la place
-- (Décommentez et utilisez cette option si vous préférez)
/*
CREATE POLICY "Allow admins to manage options" ON options
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM admin_user
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_user
      WHERE user_id = auth.uid()
    )
  );
*/

-- Si vous utilisez le service role key dans votre application admin,
-- vous pouvez aussi désactiver RLS pour cette table (moins sécurisé mais plus simple)
-- ALTER TABLE options DISABLE ROW LEVEL SECURITY;

COMMENT ON POLICY "Allow authenticated users full access to options" ON options IS 
  'Permet aux utilisateurs authentifiés de gérer (CRUD) les options';


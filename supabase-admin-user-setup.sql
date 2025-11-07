-- ============================================================================
-- Script pour créer ou vérifier l'entrée admin_user
-- ============================================================================
-- Ce script doit être exécuté dans Supabase SQL Editor
-- Remplacez 'YOUR_USER_ID_HERE' par votre user_id depuis auth.users
-- ============================================================================

-- 1. Trouver votre user_id dans auth.users
-- Exécutez cette requête pour trouver votre user_id :
-- SELECT id, email FROM auth.users WHERE email = 'votre-email@example.com';

-- 2. Créer l'entrée admin_user (remplacez YOUR_USER_ID_HERE)
INSERT INTO admin_user (user_id, first_name, last_name, email, role)
VALUES (
  'YOUR_USER_ID_HERE', -- Remplacez par votre user_id
  'Admin',
  'User',
  'votre-email@example.com', -- Remplacez par votre email
  'super_admin'
)
ON CONFLICT (email) DO UPDATE
SET 
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role;

-- 3. Vérifier que l'entrée existe
SELECT * FROM admin_user WHERE email = 'votre-email@example.com';

-- ============================================================================
-- Alternative : Si vous utilisez le service role key et n'avez pas d'utilisateur auth
-- ============================================================================
-- Dans ce cas, vous devez d'abord créer un utilisateur dans auth.users
-- via le dashboard Supabase (Authentication > Users > Add User)
-- puis exécuter le script ci-dessus avec le user_id créé.


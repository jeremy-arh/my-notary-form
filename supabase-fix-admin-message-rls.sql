-- ============================================================================
-- Fix RLS Policy for Admin Messages
-- ============================================================================
-- Ce script corrige la politique RLS pour permettre aux admins d'envoyer des messages
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Admins can send messages" ON message;

-- Créer une nouvelle politique plus permissive pour les admins
-- Cette politique vérifie que :
-- 1. Le sender_type est 'admin'
-- 2. Le sender_id correspond à un admin_user existant
-- 3. Si auth.uid() existe, vérifier que c'est bien l'admin qui envoie
--    Si auth.uid() est NULL (service role), on accepte quand même si sender_id correspond à un admin_user
CREATE POLICY "Admins can send messages"
  ON message FOR INSERT
  WITH CHECK (
    sender_type = 'admin' AND
    EXISTS (
      SELECT 1 FROM admin_user a
      WHERE a.id::text = sender_id::text
      AND (
        auth.uid() IS NULL  -- Service role key (bypass)
        OR a.user_id = auth.uid()  -- Normal auth
        OR is_admin()  -- Vérification via fonction helper
      )
    )
  );

-- Vérifier que la politique existe
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'message' AND policyname = 'Admins can send messages';

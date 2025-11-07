-- Migration pour ajouter le support des pièces jointes dans les messages
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne attachments (JSONB) à la table message
ALTER TABLE public.message 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Index pour optimiser les requêtes sur les attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments ON public.message USING GIN (attachments);

-- Commentaire sur la colonne
COMMENT ON COLUMN public.message.attachments IS 'Array of attachment objects: [{"name": "file.pdf", "url": "https://...", "type": "application/pdf", "size": 12345}]';


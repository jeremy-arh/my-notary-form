-- Migration pour ajouter les colonnes IP et langue à la table analytics_events
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne IP address
ALTER TABLE public.analytics_events 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45); -- IPv6 peut être jusqu'à 45 caractères

-- Ajouter la colonne langue du navigateur
ALTER TABLE public.analytics_events 
ADD COLUMN IF NOT EXISTS language VARCHAR(10); -- Code langue (ex: 'en', 'fr', 'es')

-- Créer un index sur la langue pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_analytics_events_language ON public.analytics_events(language);

-- Créer un index sur l'IP pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_analytics_events_ip_address ON public.analytics_events(ip_address);


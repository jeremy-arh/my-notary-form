-- Migration pour créer la table analytics_events
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL, -- 'pageview', 'visit', 'form_start', 'form_step', etc.
  page_path VARCHAR(500), -- Chemin de la page (ex: '/form/documents')
  visitor_id VARCHAR(255), -- Identifiant unique du visiteur (cookie/localStorage)
  session_id VARCHAR(255), -- Identifiant de session
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Utilisateur connecté (optionnel)
  
  -- Informations géographiques
  country_code VARCHAR(10), -- Code pays (ex: 'FR', 'GB', 'US')
  country_name VARCHAR(255), -- Nom du pays
  city VARCHAR(255),
  region VARCHAR(255),
  
  -- Informations sur l'appareil
  device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet'
  browser_name VARCHAR(100), -- 'Chrome', 'Firefox', etc.
  browser_version VARCHAR(50),
  os_name VARCHAR(100), -- 'Windows', 'macOS', 'iOS', 'Android'
  os_version VARCHAR(50),
  screen_width INTEGER,
  screen_height INTEGER,
  
  -- Informations sur la visite
  referrer TEXT, -- URL de référence
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  
  -- Métadonnées supplémentaires
  metadata JSONB DEFAULT '{}'::jsonb, -- Données supplémentaires (step number, service selected, etc.)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path ON public.analytics_events(page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country_code ON public.analytics_events(country_code);
CREATE INDEX IF NOT EXISTS idx_analytics_events_device_type ON public.analytics_events(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);

-- RLS Policies
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Permettre l'insertion publique (pour le tracking depuis le frontend)
DROP POLICY IF EXISTS "Allow public insert for analytics" ON public.analytics_events;
CREATE POLICY "Allow public insert for analytics" ON public.analytics_events
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Permettre la lecture aux admins uniquement
DROP POLICY IF EXISTS "Allow admin read access" ON public.analytics_events;
CREATE POLICY "Allow admin read access" ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_user
      WHERE admin_user.user_id = auth.uid()
    )
  );

-- Permettre la lecture avec service role (pour les fonctions edge et dashboard admin)
DROP POLICY IF EXISTS "Allow service role read access" ON public.analytics_events;
CREATE POLICY "Allow service role read access" ON public.analytics_events
  FOR SELECT
  TO service_role
  USING (true);

-- Permettre la lecture publique pour le développement (à retirer en production si nécessaire)
-- Cette politique permet de lire les données même sans authentification
-- Utile pour le dashboard admin qui utilise service role key
DROP POLICY IF EXISTS "Allow public read access for analytics" ON public.analytics_events;
CREATE POLICY "Allow public read access for analytics" ON public.analytics_events
  FOR SELECT
  TO public
  USING (true);


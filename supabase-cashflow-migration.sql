-- Migration pour créer les tables de suivi de trésorerie
-- À exécuter dans Supabase SQL Editor

-- Table pour les coûts mensuels des webservices
CREATE TABLE IF NOT EXISTS public.webservice_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  service_name VARCHAR(255) NOT NULL,
  cost_amount NUMERIC(10, 2) NOT NULL,
  billing_period VARCHAR(50) NOT NULL DEFAULT 'monthly', -- monthly, yearly
  billing_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT webservice_costs_pkey PRIMARY KEY (id)
);

-- Table pour les coûts Google Ads (journaliers)
CREATE TABLE IF NOT EXISTS public.google_ads_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cost_amount NUMERIC(10, 2) NOT NULL,
  cost_date DATE NOT NULL,
  campaign_name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT google_ads_costs_pkey PRIMARY KEY (id)
);

-- Table pour les versements aux notaires
CREATE TABLE IF NOT EXISTS public.notary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  notary_name VARCHAR(255) NOT NULL,
  payment_amount NUMERIC(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  submission_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notary_payments_pkey PRIMARY KEY (id)
);

-- Index pour optimiser les requêtes par date
CREATE INDEX IF NOT EXISTS idx_webservice_costs_billing_date ON public.webservice_costs(billing_date);
CREATE INDEX IF NOT EXISTS idx_google_ads_costs_date ON public.google_ads_costs(cost_date);
CREATE INDEX IF NOT EXISTS idx_notary_payments_date ON public.notary_payments(payment_date);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webservice_costs_updated_at
  BEFORE UPDATE ON webservice_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_ads_costs_updated_at
  BEFORE UPDATE ON google_ads_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notary_payments_updated_at
  BEFORE UPDATE ON notary_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (si nécessaire)
ALTER TABLE webservice_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notary_payments ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre l'accès aux utilisateurs authentifiés
CREATE POLICY "Allow authenticated users full access to webservice_costs" ON webservice_costs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to google_ads_costs" ON google_ads_costs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to notary_payments" ON notary_payments
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


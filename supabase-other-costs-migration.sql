-- Migration pour ajouter la table other_costs
-- À exécuter dans Supabase SQL Editor

-- ============================================================================
-- TABLE other_costs (Coûts quelconques : prestataires, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.other_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  cost_name VARCHAR(255) NOT NULL,
  cost_amount NUMERIC(10, 2) NOT NULL,
  cost_date DATE NOT NULL,
  category VARCHAR(100), -- Ex: 'prestataire', 'fournisseur', 'autre'
  description TEXT
);

-- RLS pour other_costs
ALTER TABLE public.other_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users full access to other_costs" ON public.other_costs;
CREATE POLICY "Allow authenticated users full access to other_costs" ON public.other_costs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Indexes pour other_costs
CREATE INDEX IF NOT EXISTS idx_other_costs_user_id ON public.other_costs (user_id);
CREATE INDEX IF NOT EXISTS idx_other_costs_cost_date ON public.other_costs (cost_date);
CREATE INDEX IF NOT EXISTS idx_other_costs_category ON public.other_costs (category);


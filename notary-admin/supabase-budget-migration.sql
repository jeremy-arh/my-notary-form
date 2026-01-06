-- Migration pour ajouter la table budget
-- Exécutez ce script dans votre Supabase SQL Editor

-- Table pour stocker le budget initial
CREATE TABLE IF NOT EXISTS budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initial_budget NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id) -- Un seul budget actif
);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_updated_at
  BEFORE UPDATE ON budget
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_updated_at();

-- Insérer un budget initial par défaut (0€)
INSERT INTO budget (initial_budget, description)
VALUES (0, 'Budget initial')
ON CONFLICT DO NOTHING;

-- RLS (Row Level Security) - Permettre la lecture publique et l'écriture pour les admins
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous
CREATE POLICY "Budget is viewable by everyone"
  ON budget FOR SELECT
  USING (true);

-- Politique pour permettre la modification aux utilisateurs authentifiés
CREATE POLICY "Budget is updatable by authenticated users"
  ON budget FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Budget is insertable by authenticated users"
  ON budget FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


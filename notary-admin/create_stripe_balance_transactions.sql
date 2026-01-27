-- Créer la table stripe_balance_transactions dans public pour stocker les transactions Stripe
CREATE TABLE IF NOT EXISTS public.stripe_balance_transactions (
  id TEXT PRIMARY KEY,
  amount BIGINT NOT NULL,
  net BIGINT NOT NULL,
  fee BIGINT NOT NULL,
  currency TEXT,
  created TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stripe_balance_transactions_created ON public.stripe_balance_transactions(created DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_balance_transactions_type ON public.stripe_balance_transactions(type);

-- RLS
ALTER TABLE public.stripe_balance_transactions ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Stripe balance transactions are viewable by authenticated users" ON public.stripe_balance_transactions;
DROP POLICY IF EXISTS "Stripe balance transactions are insertable by authenticated users" ON public.stripe_balance_transactions;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Stripe balance transactions are viewable by authenticated users"
  ON public.stripe_balance_transactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Politique pour permettre l'insertion aux utilisateurs authentifiés
CREATE POLICY "Stripe balance transactions are insertable by authenticated users"
  ON public.stripe_balance_transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_stripe_balance_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS update_stripe_balance_transactions_updated_at ON public.stripe_balance_transactions;

CREATE TRIGGER update_stripe_balance_transactions_updated_at
  BEFORE UPDATE ON public.stripe_balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_balance_transactions_updated_at();

-- ============================================================
-- FONCTION SQL SIMPLE POUR SYNCHRONISER LES DONNÉES STRIPE
-- ============================================================
-- 1. Activez l'extension pg_net (une seule fois) :
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Créez la fonction (remplacez VOTRE_CLE_STRIPE_SECRETE par votre vraie clé) :
CREATE OR REPLACE FUNCTION sync_stripe_balance_transactions()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stripe_api_key TEXT := 'VOTRE_CLE_STRIPE_SECRETE'; -- Remplacez par votre clé Stripe
  response_data JSONB;
  transaction_record JSONB;
  synced INTEGER := 0;
  has_more BOOLEAN := true;
  starting_after TEXT := NULL;
  url TEXT;
  http_response RECORD;
BEGIN
  -- Boucle pour récupérer toutes les pages
  WHILE has_more LOOP
    -- Construire l'URL avec les paramètres
    url := 'https://api.stripe.com/v1/balance_transactions?limit=100&type=charge';
    IF starting_after IS NOT NULL THEN
      url := url || '&starting_after=' || starting_after;
    END IF;

    -- Appeler l'API Stripe via pg_net
    SELECT * INTO http_response
    FROM net.http_get(
      url := url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || stripe_api_key
      )
    );

    -- Parser la réponse JSON
    response_data := (http_response.content)::JSONB;
    
    -- Insérer chaque transaction
    FOR transaction_record IN SELECT * FROM jsonb_array_elements(response_data->'data')
    LOOP
      INSERT INTO public.stripe_balance_transactions (
        id, amount, net, fee, currency, created, description, type
      )
      VALUES (
        transaction_record->>'id',
        (transaction_record->>'amount')::BIGINT,
        (transaction_record->>'net')::BIGINT,
        (transaction_record->>'fee')::BIGINT,
        transaction_record->>'currency',
        to_timestamp((transaction_record->>'created')::BIGINT),
        transaction_record->>'description',
        transaction_record->>'type'
      )
      ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount,
        net = EXCLUDED.net,
        fee = EXCLUDED.fee,
        currency = EXCLUDED.currency,
        created = EXCLUDED.created,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        updated_at = NOW();
      
      synced := synced + 1;
      starting_after := transaction_record->>'id';
    END LOOP;

    -- Vérifier s'il y a plus de pages
    has_more := COALESCE((response_data->>'has_more')::BOOLEAN, false);
  END LOOP;

  RETURN 'Synchronisation réussie: ' || synced || ' transactions synchronisées';
END;
$$;

-- 3. Appelez la fonction pour synchroniser :
-- SELECT sync_stripe_balance_transactions();
-- ============================================================

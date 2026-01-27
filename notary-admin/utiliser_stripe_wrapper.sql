-- ============================================================
-- UTILISER LE WRAPPER STRIPE DE SUPABASE
-- ============================================================
-- Ce script vérifie si le wrapper Stripe existe et crée une vue
-- pour accéder aux balance_transactions depuis le schéma stripe

-- Étape 1: Activer l'extension wrappers (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS wrappers;

-- Étape 2: Vérifier si le schéma stripe existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN
    CREATE SCHEMA IF NOT EXISTS stripe;
    RAISE NOTICE 'Schéma stripe créé';
  ELSE
    RAISE NOTICE 'Schéma stripe existe déjà';
  END IF;
END $$;

-- Étape 3: Vérifier si la table stripe.balance_transactions existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'stripe' 
    AND table_name = 'balance_transactions'
  ) THEN
    RAISE NOTICE 'Table stripe.balance_transactions existe - Création de la vue';
    
    -- Créer une vue dans public pour accéder aux données
    CREATE OR REPLACE VIEW public.stripe_balance_transactions_view AS
    SELECT 
      id,
      amount,
      net,
      fee,
      currency,
      created,
      COALESCE(description, '') as description,
      type
    FROM stripe.balance_transactions
    WHERE type = 'charge';
    
    -- Donner les permissions
    GRANT SELECT ON public.stripe_balance_transactions_view TO authenticated;
    GRANT SELECT ON public.stripe_balance_transactions_view TO anon;
    
    RAISE NOTICE 'Vue public.stripe_balance_transactions_view créée avec succès';
  ELSE
    RAISE NOTICE 'Table stripe.balance_transactions n''existe pas encore';
    RAISE NOTICE 'Vous devez configurer le wrapper Stripe dans Supabase Dashboard';
    RAISE NOTICE 'Allez dans Database > Wrappers et configurez Stripe';
  END IF;
END $$;

-- Étape 4: Vérifier le résultat
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'stripe_balance_transactions_view'
    ) THEN 'Vue créée - Vous pouvez utiliser stripe_balance_transactions_view'
    ELSE 'Vue non créée - Le wrapper Stripe doit être configuré'
  END as status;

-- Si la vue existe, tester l'accès
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'stripe_balance_transactions_view'
  ) THEN
    PERFORM COUNT(*) FROM public.stripe_balance_transactions_view LIMIT 1;
    RAISE NOTICE 'Accès à la vue réussi';
  END IF;
END $$;

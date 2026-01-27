-- ============================================================
-- SCRIPT SIMPLE POUR SYNCHRONISER LES DONNÉES STRIPE
-- ============================================================
-- 1. Remplacez 'VOTRE_CLE_STRIPE_SECRETE' par votre vraie clé Stripe (sk_test_... ou sk_live_...)
-- 2. Exécutez ce script dans Supabase SQL Editor

-- Vérifier que l'extension pg_net est activée
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Créer ou remplacer la fonction de synchronisation
CREATE OR REPLACE FUNCTION sync_stripe_balance_transactions()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stripe_api_key TEXT := 'VOTRE_CLE_STRIPE_SECRETE'; -- ⚠️ REMPLACEZ ICI PAR VOTRE VRAIE CLÉ STRIPE
  response_data JSONB;
  transaction_record JSONB;
  synced INTEGER := 0;
  has_more BOOLEAN := true;
  starting_after TEXT := NULL;
  url TEXT;
  http_response RECORD;
BEGIN
  -- Vérifier que la clé a été remplacée
  IF stripe_api_key = 'VOTRE_CLE_STRIPE_SECRETE' THEN
    RETURN 'ERREUR: Vous devez remplacer VOTRE_CLE_STRIPE_SECRETE par votre vraie clé Stripe dans la fonction !';
  END IF;

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

    -- Vérifier le code de statut HTTP
    IF http_response.status_code != 200 THEN
      RETURN 'ERREUR API Stripe (code ' || http_response.status_code || '): ' || COALESCE(http_response.content::TEXT, 'Pas de réponse');
    END IF;

    -- Parser la réponse JSON
    response_data := (http_response.content)::JSONB;
    
    -- Vérifier s'il y a une erreur dans la réponse
    IF response_data ? 'error' THEN
      RETURN 'ERREUR Stripe: ' || (response_data->'error'->>'message')::TEXT;
    END IF;
    
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
    
    -- Limite de sécurité pour éviter les boucles infinies
    IF synced > 10000 THEN
      RETURN 'ATTENTION: Limite de 10000 transactions atteinte. ' || synced || ' transactions synchronisées.';
    END IF;
  END LOOP;

  RETURN 'Synchronisation réussie: ' || synced || ' transactions synchronisées';
END;
$$;

-- Appeler la fonction pour synchroniser les données
-- ⚠️ N'OUBLIEZ PAS DE REMPLACER LA CLÉ STRIPE AVANT D'EXÉCUTER !
SELECT sync_stripe_balance_transactions();

-- Vérifier le résultat
SELECT COUNT(*) as total_transactions FROM public.stripe_balance_transactions;
SELECT * FROM public.stripe_balance_transactions ORDER BY created DESC LIMIT 10;

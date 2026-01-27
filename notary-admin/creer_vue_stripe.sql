-- Créer une vue qui utilise la table public.stripe_balance_transactions
-- (qui doit être remplie manuellement ou via webhook)
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
FROM public.stripe_balance_transactions
WHERE type = 'charge';

-- Donner les permissions sur la vue
GRANT SELECT ON public.stripe_balance_transactions_view TO authenticated;
GRANT SELECT ON public.stripe_balance_transactions_view TO anon;

-- Fonction pour récupérer les revenus Stripe depuis balance_transactions
-- Cette fonction permet d'accéder à la table stripe.balance_transactions depuis le client JS
CREATE OR REPLACE FUNCTION public.get_stripe_revenues()
RETURNS TABLE (
  id text,
  amount bigint,
  currency text,
  description text,
  fee bigint,
  net bigint,
  status text,
  created bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bt.id,
    bt.amount,
    bt.currency,
    bt.description,
    bt.fee,
    bt.net,
    bt.status,
    EXTRACT(EPOCH FROM bt.created)::bigint as created
  FROM stripe.balance_transactions bt
  WHERE bt.status = 'available'
    AND bt.net > 0  -- Seulement les revenus (exclure les payouts)
    AND bt.currency = 'eur'
  ORDER BY bt.created DESC;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_stripe_revenues() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stripe_revenues() TO anon;

-- Commentaire
COMMENT ON FUNCTION public.get_stripe_revenues() IS 'Récupère les revenus Stripe depuis balance_transactions avec montants nets en EUR';

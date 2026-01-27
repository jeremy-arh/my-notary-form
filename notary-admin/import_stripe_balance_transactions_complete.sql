-- ============================================================
-- SCRIPT COMPLET POUR IMPORTER LES DONNÉES STRIPE
-- ============================================================
-- Ce script importe uniquement les transactions de type "charge"
-- depuis balance_transactions_rows (1).sql vers public.stripe_balance_transactions

INSERT INTO public.stripe_balance_transactions (
  id, amount, net, fee, currency, created, description, type
)
SELECT 
  id,
  amount::BIGINT,
  net::BIGINT,
  fee::BIGINT,
  currency,
  created::TIMESTAMP WITHOUT TIME ZONE,
  COALESCE(NULLIF(description, ''), '') as description,
  type
FROM (
  VALUES 
  ('txn_3SaWqu13o52MGcon1hezPW1X', '9922', '9550', '372', 'eur', '2025-12-04 07:21:48', null, 'charge'),
  ('txn_3SekID13o52MGcon1o743aWd', '30077', '28698', '1379', 'eur', '2025-12-15 22:31:57', null, 'charge'),
  ('txn_3SeVk013o52MGcon0FOX3eXw', '55196', '52687', '2509', 'eur', '2025-12-15 06:58:44', null, 'charge'),
  ('txn_3Sg6QE13o52MGcon08DaQaQe', '5897', '5607', '290', 'eur', '2025-12-19 16:21:13', null, 'charge'),
  ('txn_3SgqJM13o52MGcon0rJkcV98', '5905', '5614', '291', 'eur', '2025-12-21 17:21:21', null, 'charge'),
  ('txn_3Sh4fh13o52MGcon0w1BHyPk', '5905', '5614', '291', 'eur', '2025-12-22 08:41:13', null, 'charge'),
  ('txn_3ShNDI13o52MGcon0WsW46ZM', '5907', '5572', '335', 'eur', '2025-12-23 04:28:49', null, 'charge'),
  ('txn_3SjjmI13o52MGcon0taCJeKk', '10900', '10384', '516', 'eur', '2025-12-29 16:59:00', null, 'charge'),
  ('txn_3SjNPp13o52MGcon0OoqKCJ9', '5899', '5609', '290', 'eur', '2025-12-28 17:08:34', null, 'charge'),
  ('txn_3Sl4HZ13o52MGcon1r1UJlWq', '13800', '13326', '474', 'eur', '2026-01-02 09:04:30', null, 'charge'),
  ('txn_3Sl86u13o52MGcon073X2i5V', '5900', '5786', '114', 'eur', '2026-01-02 13:10:10', null, 'charge'),
  ('txn_3SmHxT13o52MGcon0XRXJzFQ', '5933', '5641', '292', 'eur', '2026-01-05 17:54:27', null, 'charge'),
  ('txn_3Snkp413o52MGcon1Lzj451c', '9902', '9530', '372', 'eur', '2026-01-09 18:55:43', null, 'charge'),
  ('txn_3SpHbo13o52MGcon0F655sQO', '5899', '5609', '290', 'eur', '2026-01-14 00:07:42', null, 'charge'),
  ('txn_3SpqOq13o52MGcon1raqAah6', '5899', '5609', '290', 'eur', '2026-01-15 13:16:13', null, 'charge'),
  ('txn_3SqvPH13o52MGcon1yY6WiiB', '5900', '5786', '114', 'eur', '2026-01-18 12:48:48', null, 'charge'),
  ('txn_3SreyQ13o52MGcon1uAHfUUw', '5864', '5575', '289', 'eur', '2026-01-20 13:28:27', null, 'charge'),
  ('txn_3SrhmI13o52MGcon0oyDRZsN', '11800', '11598', '202', 'eur', '2026-01-20 16:28:13', null, 'charge'),
  ('txn_3Ss9Lx13o52MGcon0qKqeFo8', '5910', '5619', '291', 'eur', '2026-01-21 21:55:12', null, 'charge'),
  ('txn_3SsRtP13o52MGcon1TCDH197', '5900', '5786', '114', 'eur', '2026-01-22 17:42:15', null, 'charge'),
  ('txn_3StYh713o52MGcon00ARWsUA', '5901', '5610', '291', 'eur', '2026-01-25 19:10:37', null, 'charge')
) AS t(id, amount, net, fee, currency, created, description, type)
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  net = EXCLUDED.net,
  fee = EXCLUDED.fee,
  currency = EXCLUDED.currency,
  created = EXCLUDED.created,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  updated_at = NOW();

-- Vérifier le résultat
SELECT COUNT(*) as total_charges FROM public.stripe_balance_transactions;
SELECT 
  id,
  amount / 100.0 as amount_eur,
  net / 100.0 as net_eur,
  fee / 100.0 as fee_eur,
  currency,
  created,
  description,
  type
FROM public.stripe_balance_transactions 
ORDER BY created DESC 
LIMIT 10;

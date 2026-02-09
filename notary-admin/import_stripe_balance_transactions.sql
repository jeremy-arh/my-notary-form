-- ============================================================
-- SCRIPT POUR IMPORTER LES DONNÉES DEPUIS balance_transactions_rows (1).sql
-- ============================================================
-- Ce script adapte les données du schéma stripe.balance_transactions
-- vers la table public.stripe_balance_transactions
-- 
-- IMPORTANT: Copiez-collez le contenu de balance_transactions_rows (1).sql
-- ci-dessous en remplaçant "stripe"."balance_transactions" par "public.stripe_balance_transactions"
-- et en supprimant les colonnes "status" et "attrs" des VALUES

-- Méthode simple: Remplacez dans votre fichier balance_transactions_rows (1).sql :
-- 1. "stripe"."balance_transactions" → "public.stripe_balance_transactions"
-- 2. Supprimez "status" et "attrs" de la liste des colonnes
-- 3. Supprimez les valeurs correspondantes dans VALUES (les 2 dernières valeurs de chaque tuple)

-- Exemple de transformation :
-- AVANT: INSERT INTO "stripe"."balance_transactions" ("id", "amount", "currency", "description", "fee", "net", "status", "type", "created", "attrs") VALUES (...)
-- APRÈS: INSERT INTO public.stripe_balance_transactions ("id", "amount", "net", "fee", "currency", "created", "description", "type") VALUES (...)

-- OU utilisez directement ce script qui filtre uniquement les charges :

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
  -- Copiez-collez ici les VALUES de votre fichier balance_transactions_rows (1).sql
  -- mais gardez uniquement: id, amount, currency, description, fee, net, type, created
  -- (supprimez status et attrs)
  ('txn_3SaWqu13o52MGcon1hezPW1X', '9922', 'eur', null, '372', '9550', 'charge', '2025-12-04 07:21:48'),
  ('txn_3SekID13o52MGcon1o743aWd', '30077', 'eur', null, '1379', '28698', 'charge', '2025-12-15 22:31:57'),
  ('txn_3SeVk013o52MGcon0FOX3eXw', '55196', 'eur', null, '2509', '52687', 'charge', '2025-12-15 06:58:44'),
  ('txn_3Sg6QE13o52MGcon08DaQaQe', '5897', 'eur', null, '290', '5607', 'charge', '2025-12-19 16:21:13'),
  ('txn_3SgqJM13o52MGcon0rJkcV98', '5905', 'eur', null, '291', '5614', 'charge', '2025-12-21 17:21:21'),
  ('txn_3Sh4fh13o52MGcon0w1BHyPk', '5905', 'eur', null, '291', '5614', 'charge', '2025-12-22 08:41:13'),
  ('txn_3ShNDI13o52MGcon0WsW46ZM', '5907', 'eur', null, '335', '5572', 'charge', '2025-12-23 04:28:49'),
  ('txn_3SjjmI13o52MGcon0taCJeKk', '10900', 'eur', null, '516', '10384', 'charge', '2025-12-29 16:59:00'),
  ('txn_3SjNPp13o52MGcon0OoqKCJ9', '5899', 'eur', null, '290', '5609', 'charge', '2025-12-28 17:08:34'),
  ('txn_3Sl4HZ13o52MGcon1r1UJlWq', '13800', 'eur', null, '474', '13326', 'charge', '2026-01-02 09:04:30'),
  ('txn_3Sl86u13o52MGcon073X2i5V', '5900', 'eur', null, '114', '5786', 'charge', '2026-01-02 13:10:10'),
  ('txn_3SmHxT13o52MGcon0XRXJzFQ', '5933', 'eur', null, '292', '5641', 'charge', '2026-01-05 17:54:27'),
  ('txn_3Snkp413o52MGcon1Lzj451c', '9902', 'eur', null, '372', '9530', 'charge', '2026-01-09 18:55:43'),
  ('txn_3SpHbo13o52MGcon0F655sQO', '5899', 'eur', null, '290', '5609', 'charge', '2026-01-14 00:07:42'),
  ('txn_3SpqOq13o52MGcon1raqAah6', '5899', 'eur', null, '290', '5609', 'charge', '2026-01-15 13:16:13'),
  ('txn_3SqvPH13o52MGcon1yY6WiiB', '5900', 'eur', null, '114', '5786', 'charge', '2026-01-18 12:48:48'),
  ('txn_3SreyQ13o52MGcon1uAHfUUw', '5864', 'eur', null, '289', '5575', 'charge', '2026-01-20 13:28:27'),
  ('txn_3SrhmI13o52MGcon0oyDRZsN', '11800', 'eur', null, '202', '11598', 'charge', '2026-01-20 16:28:13'),
  ('txn_3Ss9Lx13o52MGcon0qKqeFo8', '5910', 'eur', null, '291', '5619', 'charge', '2026-01-21 21:55:12'),
  ('txn_3SsRtP13o52MGcon1TCDH197', '5900', 'eur', null, '114', '5786', 'charge', '2026-01-22 17:42:15'),
  ('txn_3StYh713o52MGcon00ARWsUA', '5901', 'eur', null, '291', '5610', 'charge', '2026-01-25 19:10:37')
) AS t(id, amount, currency, description, fee, net, type, created)
WHERE type = 'charge'  -- Filtrer uniquement les charges
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
SELECT * FROM public.stripe_balance_transactions ORDER BY created DESC LIMIT 10;

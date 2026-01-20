-- Script pour vérifier si le cron job pour les coûts récurrents est bien initialisé
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si les extensions sont activées
SELECT 
  extname as extension_name,
  extversion as version
FROM pg_extension 
WHERE extname IN ('pg_cron', 'pg_net');

-- 2. Vérifier si le cron job existe
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'generate-recurring-webservice-costs';

-- 3. Voir tous les cron jobs actifs
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database,
  username
FROM cron.job
ORDER BY jobname;

-- 4. Voir l'historique d'exécution du cron (10 dernières exécutions)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'generate-recurring-webservice-costs'
)
ORDER BY start_time DESC 
LIMIT 10;

-- 5. Vérifier les templates récurrents actifs
SELECT 
  id,
  service_name,
  cost_amount,
  billing_period,
  billing_date,
  is_recurring,
  is_active,
  recurring_template_id,
  parent_cost_id,
  created_at
FROM public.webservice_costs
WHERE is_recurring = true 
  AND is_active = true 
  AND billing_period = 'monthly'
  AND recurring_template_id IS NULL
ORDER BY service_name;

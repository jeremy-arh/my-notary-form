-- Script de diagnostic pour vérifier les templates récurrents
-- Exécutez ce script pour voir l'état actuel de vos templates récurrents

-- 1. Voir tous les templates récurrents (actifs et inactifs)
SELECT 
  id,
  service_name,
  billing_date as template_billing_date,
  cost_amount,
  billing_period,
  is_recurring,
  is_active,
  recurring_template_id,
  parent_cost_id,
  created_at
FROM public.webservice_costs
WHERE is_recurring = true
ORDER BY service_name, created_at;

-- 2. Voir seulement les templates récurrents ACTIFS (ceux que la fonction devrait traiter)
SELECT 
  id,
  service_name,
  billing_date as template_billing_date,
  cost_amount,
  billing_period,
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

-- 3. Voir toutes les occurrences générées pour chaque template
SELECT 
  t.id as template_id,
  t.service_name as template_name,
  t.billing_date as template_billing_date,
  o.id as occurrence_id,
  o.billing_date as occurrence_billing_date,
  o.cost_amount,
  o.recurring_template_id,
  o.is_recurring as occurrence_is_recurring,
  CASE 
    WHEN o.recurring_template_id IS NULL THEN 'ORPHAN'
    WHEN o.recurring_template_id != t.id THEN 'WRONG_TEMPLATE'
    WHEN o.billing_date > CURRENT_DATE THEN 'FUTURE'
    ELSE 'OK'
  END as status
FROM public.webservice_costs t
LEFT JOIN public.webservice_costs o 
  ON o.recurring_template_id = t.id
WHERE t.is_recurring = true 
  AND t.is_active = true 
  AND t.billing_period = 'monthly'
  AND t.recurring_template_id IS NULL
ORDER BY t.service_name, o.billing_date;

-- 4. Compter les occurrences par template
SELECT 
  t.service_name,
  t.billing_date as template_billing_date,
  COUNT(o.id) as occurrence_count,
  MIN(o.billing_date) as first_occurrence,
  MAX(o.billing_date) as last_occurrence,
  COUNT(CASE WHEN o.billing_date > CURRENT_DATE THEN 1 END) as future_count,
  COUNT(CASE WHEN o.recurring_template_id IS NULL THEN 1 END) as orphan_count
FROM public.webservice_costs t
LEFT JOIN public.webservice_costs o 
  ON o.recurring_template_id = t.id
WHERE t.is_recurring = true 
  AND t.is_active = true 
  AND t.billing_period = 'monthly'
  AND t.recurring_template_id IS NULL
GROUP BY t.id, t.service_name, t.billing_date
ORDER BY t.service_name;

-- 5. Voir toutes les lignes "One notary" pour comprendre le problème
SELECT 
  id,
  service_name,
  billing_date,
  cost_amount,
  is_recurring,
  is_active,
  recurring_template_id,
  parent_cost_id,
  created_at
FROM public.webservice_costs
WHERE service_name = 'One notary'
ORDER BY billing_date DESC, created_at DESC;

-- 6. Voir toutes les lignes "Vercel" pour comprendre le problème
SELECT 
  id,
  service_name,
  billing_date,
  cost_amount,
  is_recurring,
  is_active,
  recurring_template_id,
  parent_cost_id,
  created_at
FROM public.webservice_costs
WHERE service_name = 'Vercel'
ORDER BY billing_date DESC, created_at DESC;

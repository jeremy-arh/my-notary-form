-- Script SQL pour corriger spécifiquement la ligne One Notary du 16/01/2026
-- Ce script :
-- 1. Trouve le template récurrent "One notary"
-- 2. Supprime la ligne orpheline du 16/01/2026 (sans recurring_template_id)
-- 3. Crée la ligne correcte avec recurring_template_id

-- Étape 1: Trouver le template récurrent "One notary"
DO $$
DECLARE
  template_id_var UUID;
  target_date DATE := '2026-01-16';
  deleted_count INTEGER;
BEGIN
  -- Trouver le template récurrent actif pour "One notary"
  SELECT id INTO template_id_var
  FROM public.webservice_costs
  WHERE service_name = 'One notary'
    AND is_recurring = true
    AND is_active = true
    AND billing_period = 'monthly'
    AND recurring_template_id IS NULL
  LIMIT 1;
  
  IF template_id_var IS NULL THEN
    RAISE NOTICE 'Aucun template récurrent trouvé pour "One notary"';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Template trouvé avec ID: %', template_id_var;
  
  -- Étape 2: Vérifier si une occurrence correcte existe déjà
  IF EXISTS (
    SELECT 1 FROM public.webservice_costs
    WHERE recurring_template_id = template_id_var
      AND billing_date = target_date
  ) THEN
    RAISE NOTICE 'Une occurrence correcte existe déjà pour le %', target_date;
  ELSE
    -- Étape 3: Supprimer les lignes orphelines (même service, même date, mais sans recurring_template_id)
    DELETE FROM public.webservice_costs
    WHERE service_name = 'One notary'
      AND billing_date = target_date
      AND (recurring_template_id IS NULL OR recurring_template_id != template_id_var)
      AND is_recurring = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Lignes orphelines supprimées: %', deleted_count;
    
    -- Étape 4: Créer la ligne correcte avec recurring_template_id
    INSERT INTO public.webservice_costs (
      service_name,
      cost_amount,
      billing_period,
      billing_date,
      description,
      is_recurring,
      is_active,
      recurring_template_id,
      parent_cost_id
    )
    SELECT 
      service_name,
      cost_amount,
      billing_period,
      target_date,
      description,
      false,  -- Les occurrences ne sont pas récurrentes
      true,   -- Actives par défaut
      template_id_var,  -- Lien vers le template
      template_id_var
    FROM public.webservice_costs
    WHERE id = template_id_var;
    
    RAISE NOTICE 'Ligne créée avec succès pour le % avec recurring_template_id = %', target_date, template_id_var;
  END IF;
END $$;

-- Vérification: Voir toutes les lignes One notary
SELECT 
  id,
  service_name,
  billing_date,
  cost_amount,
  is_recurring,
  recurring_template_id,
  parent_cost_id,
  created_at
FROM public.webservice_costs
WHERE service_name = 'One notary'
ORDER BY billing_date DESC, created_at DESC;

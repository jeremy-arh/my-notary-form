-- Version debug de la fonction pour voir ce qui se passe
-- Cette fonction affiche des informations de diagnostic avant de corriger

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.fix_all_recurring_costs_debug();

CREATE FUNCTION public.fix_all_recurring_costs_debug()
RETURNS TABLE (
  step TEXT,
  template_id UUID,
  template_name TEXT,
  info TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_record RECORD;
  template_count INTEGER := 0;
  current_date_val DATE;
BEGIN
  current_date_val := CURRENT_DATE;
  
  -- Étape 1: Compter les templates récurrents
  SELECT COUNT(*) INTO template_count
  FROM public.webservice_costs 
  WHERE is_recurring = true 
    AND is_active = true 
    AND billing_period = 'monthly'
    AND recurring_template_id IS NULL;
  
  RETURN QUERY SELECT 
    'STEP_1'::TEXT,
    NULL::UUID,
    'Template Count'::TEXT,
    ('Found ' || template_count || ' active recurring templates')::TEXT;
  
  -- Étape 2: Lister tous les templates trouvés
  FOR template_record IN 
    SELECT * FROM public.webservice_costs 
    WHERE is_recurring = true 
      AND is_active = true 
      AND billing_period = 'monthly'
      AND recurring_template_id IS NULL
    ORDER BY service_name
  LOOP
    RETURN QUERY SELECT 
      'STEP_2'::TEXT,
      template_record.id,
      template_record.service_name::TEXT,
      ('Template found: ' || template_record.service_name || 
       ', billing_date: ' || template_record.billing_date::TEXT ||
       ', is_recurring: ' || template_record.is_recurring::TEXT ||
       ', is_active: ' || template_record.is_active::TEXT ||
       ', billing_period: ' || COALESCE(template_record.billing_period, 'NULL') ||
       ', recurring_template_id: ' || COALESCE(template_record.recurring_template_id::TEXT, 'NULL'))::TEXT;
  END LOOP;
  
  -- Étape 3: Vérifier les templates avec des conditions moins strictes
  SELECT COUNT(*) INTO template_count
  FROM public.webservice_costs 
  WHERE is_recurring = true;
  
  RETURN QUERY SELECT 
    'STEP_3'::TEXT,
    NULL::UUID,
    'All Recurring'::TEXT,
    ('Found ' || template_count || ' templates with is_recurring = true (regardless of other conditions)')::TEXT;
  
  -- Étape 4: Voir les templates avec is_recurring = true mais qui ne passent pas les autres filtres
  FOR template_record IN 
    SELECT * FROM public.webservice_costs 
    WHERE is_recurring = true
      AND (
        is_active != true 
        OR billing_period != 'monthly'
        OR recurring_template_id IS NOT NULL
      )
    ORDER BY service_name
    LIMIT 10
  LOOP
    RETURN QUERY SELECT 
      'STEP_4'::TEXT,
      template_record.id,
      template_record.service_name::TEXT,
      ('Template excluded: ' || template_record.service_name || 
       ', is_active: ' || COALESCE(template_record.is_active::TEXT, 'NULL') ||
       ', billing_period: ' || COALESCE(template_record.billing_period, 'NULL') ||
       ', recurring_template_id: ' || COALESCE(template_record.recurring_template_id::TEXT, 'NULL'))::TEXT;
  END LOOP;
  
  -- Si aucun template n'a été trouvé, retourner un message
  IF template_count = 0 THEN
    RETURN QUERY SELECT 
      'ERROR'::TEXT,
      NULL::UUID,
      'No Templates'::TEXT,
      'No active recurring templates found. Check the diagnostic script to see what templates exist.'::TEXT;
  END IF;
END;
$$;

-- Exécuter la fonction de debug
-- SELECT * FROM fix_all_recurring_costs_debug();

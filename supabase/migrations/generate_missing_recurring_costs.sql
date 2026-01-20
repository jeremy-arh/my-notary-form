-- Fonction pour générer manuellement tous les coûts récurrents en retard
-- Cette fonction peut être appelée pour rattraper les lignes manquantes
-- Usage: SELECT * FROM generate_missing_recurring_costs();

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.generate_missing_recurring_costs();

CREATE FUNCTION public.generate_missing_recurring_costs()
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  generated_date DATE,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_record RECORD;
  current_date_val DATE;
  target_date DATE;
  month_start DATE;
  month_end DATE;
  billing_day INTEGER;
  last_generated_date DATE;
  month_to_check DATE;
  generated_count INTEGER := 0;
  total_generated INTEGER := 0;
BEGIN
  current_date_val := CURRENT_DATE;
  
  -- Parcourir tous les templates récurrents actifs
  FOR template_record IN 
    SELECT * FROM public.webservice_costs 
    WHERE is_recurring = true 
      AND is_active = true 
      AND billing_period = 'monthly'
      AND recurring_template_id IS NULL  -- Seulement les templates (pas les occurrences)
    ORDER BY service_name
  LOOP
    billing_day := EXTRACT(DAY FROM template_record.billing_date)::INTEGER;
    generated_count := 0;
    
    -- Parcourir tous les mois depuis la date de création du template jusqu'à aujourd'hui
    month_to_check := DATE_TRUNC('month', template_record.billing_date)::DATE;
    
    WHILE month_to_check <= DATE_TRUNC('month', current_date_val)::DATE LOOP
      month_start := month_to_check;
      month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      
      -- Calculer la date cible pour ce mois
      target_date := month_start + (billing_day - 1) * INTERVAL '1 day';
      
      -- Si le jour n'existe pas dans le mois (ex: 31 février), prendre le dernier jour
      IF target_date > month_end THEN
        target_date := month_end;
      END IF;
      
      -- Vérifier si une occurrence existe déjà pour ce mois
      SELECT MAX(billing_date) INTO last_generated_date
      FROM public.webservice_costs
      WHERE recurring_template_id = template_record.id
        AND billing_date >= month_start
        AND billing_date <= month_end;
      
      -- Si aucune occurrence n'existe pour ce mois et que la date cible est passée ou aujourd'hui
      IF last_generated_date IS NULL AND target_date <= current_date_val THEN
        -- Créer la nouvelle occurrence
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
        ) VALUES (
          template_record.service_name,
          template_record.cost_amount,
          template_record.billing_period,
          target_date,
          template_record.description,
          false,  -- Les occurrences ne sont pas récurrentes
          true,   -- Actives par défaut
          template_record.id,  -- Lien vers le template
          template_record.id
        );
        
        generated_count := generated_count + 1;
        total_generated := total_generated + 1;
        
        -- Retourner l'information sur la ligne créée
        RETURN QUERY SELECT 
          template_record.id,
          template_record.service_name::TEXT,
          target_date,
          'CREATED'::TEXT;
      END IF;
      
      -- Passer au mois suivant
      month_to_check := month_to_check + INTERVAL '1 month';
    END LOOP;
    
    -- Si aucune ligne n'a été générée pour ce template, retourner une ligne d'info
    IF generated_count = 0 THEN
      RETURN QUERY SELECT 
        template_record.id,
        template_record.service_name::TEXT,
        NULL::DATE,
        'NO_MISSING_COSTS'::TEXT;
    END IF;
  END LOOP;
  
  -- Retourner un résumé si aucun template n'a été trouvé
  IF total_generated = 0 THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      'No active recurring templates found'::TEXT,
      NULL::DATE,
      'INFO'::TEXT;
  END IF;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.generate_missing_recurring_costs() IS 
'Génère manuellement tous les coûts récurrents en retard pour tous les templates actifs. 
Retourne un tableau avec les détails de chaque ligne créée.';

-- Exemple d'utilisation :
-- SELECT * FROM generate_missing_recurring_costs();

-- Pour voir seulement les lignes créées :
-- SELECT * FROM generate_missing_recurring_costs() WHERE status = 'CREATED';

-- Pour voir un résumé par template :
-- SELECT 
--   template_name,
--   COUNT(*) FILTER (WHERE status = 'CREATED') as created_count,
--   COUNT(*) FILTER (WHERE status = 'NO_MISSING_COSTS') as up_to_date_count
-- FROM generate_missing_recurring_costs()
-- GROUP BY template_name;

-- Version simplifiée : Fonction pour générer manuellement tous les coûts récurrents en retard
-- Cette fonction crée les lignes manquantes sans retourner de tableau
-- Usage: SELECT generate_missing_recurring_costs_simple();

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.generate_missing_recurring_costs_simple();

CREATE FUNCTION public.generate_missing_recurring_costs_simple()
RETURNS INTEGER
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
        
        total_generated := total_generated + 1;
      END IF;
      
      -- Passer au mois suivant
      month_to_check := month_to_check + INTERVAL '1 month';
    END LOOP;
  END LOOP;
  
  RETURN total_generated;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.generate_missing_recurring_costs_simple() IS 
'Génère manuellement tous les coûts récurrents en retard pour tous les templates actifs. 
Retourne le nombre total de lignes créées.';

-- Exemple d'utilisation :
-- SELECT generate_missing_recurring_costs_simple();

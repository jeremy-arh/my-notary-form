-- Fonction SIMPLIFIÉE et ROBUSTE pour corriger tous les coûts récurrents
-- Cette version fonctionne étape par étape et ignore is_active si nécessaire
-- Usage: SELECT * FROM fix_recurring_costs_simple();

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.fix_recurring_costs_simple();

CREATE FUNCTION public.fix_recurring_costs_simple()
RETURNS TABLE (
  action TEXT,
  service_name TEXT,
  billing_date DATE,
  message TEXT
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
  month_to_check DATE;
  template_month_start DATE;
  existing_count INTEGER;
  deleted_count INTEGER;
  created_count INTEGER := 0;
  total_created INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  current_date_val := CURRENT_DATE;
  
  -- Parcourir TOUS les templates récurrents (même si is_active n'est pas true)
  -- On va être moins strict sur les conditions pour être sûr de tout trouver
  FOR template_record IN 
    SELECT * FROM public.webservice_costs 
    WHERE is_recurring = true 
      AND billing_period = 'monthly'
      AND (recurring_template_id IS NULL OR parent_cost_id IS NULL)
    ORDER BY service_name, billing_date
  LOOP
    -- Extraire le jour du mois de la date de facturation du template
    billing_day := EXTRACT(DAY FROM template_record.billing_date)::INTEGER;
    
    -- Commencer depuis le mois du template
    template_month_start := DATE_TRUNC('month', template_record.billing_date)::DATE;
    month_to_check := template_month_start;
    
    -- Parcourir tous les mois depuis le template jusqu'à aujourd'hui
    WHILE month_to_check <= DATE_TRUNC('month', current_date_val)::DATE LOOP
      month_start := month_to_check;
      month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      
      -- Calculer la date cible pour ce mois (même jour que le template)
      target_date := month_start + (billing_day - 1) * INTERVAL '1 day';
      
      -- Si le jour n'existe pas dans le mois (ex: 31 février), prendre le dernier jour
      IF target_date > month_end THEN
        target_date := month_end;
      END IF;
      
      -- Ne créer que si la date est passée ou aujourd'hui (pas les dates futures)
      IF target_date <= current_date_val THEN
        -- Vérifier si une occurrence correcte existe déjà (avec recurring_template_id)
        SELECT COUNT(*) INTO existing_count
        FROM public.webservice_costs wc
        WHERE wc.recurring_template_id = template_record.id
          AND wc.billing_date = target_date;
        
        -- Si aucune occurrence correcte n'existe
        IF existing_count = 0 THEN
          -- Supprimer les lignes orphelines (même service, même date, mais sans recurring_template_id ou avec mauvais ID)
          DELETE FROM public.webservice_costs wc
          WHERE wc.service_name = template_record.service_name
            AND wc.billing_date = target_date
            AND wc.is_recurring = false
            AND (wc.recurring_template_id IS NULL OR wc.recurring_template_id != template_record.id);
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          IF deleted_count > 0 THEN
            total_deleted := total_deleted + deleted_count;
            RETURN QUERY SELECT 
              'DELETED'::TEXT,
              template_record.service_name::TEXT,
              target_date,
              ('Deleted ' || deleted_count || ' orphan line(s)')::TEXT;
          END IF;
          
          -- Créer la nouvelle occurrence avec recurring_template_id
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
          
          created_count := created_count + 1;
          total_created := total_created + 1;
          
          RETURN QUERY SELECT 
            'CREATED'::TEXT,
            template_record.service_name::TEXT,
            target_date,
            'Created missing occurrence'::TEXT;
        END IF;
      END IF;
      
      -- Passer au mois suivant
      month_to_check := month_to_check + INTERVAL '1 month';
    END LOOP;
    
    -- Supprimer TOUTES les occurrences futures pour ce template (dates > aujourd'hui)
    DELETE FROM public.webservice_costs wc
    WHERE wc.recurring_template_id = template_record.id
      AND wc.billing_date > current_date_val;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      total_deleted := total_deleted + deleted_count;
      RETURN QUERY SELECT 
        'DELETED'::TEXT,
        template_record.service_name::TEXT,
        NULL::DATE,
        ('Deleted ' || deleted_count || ' future occurrence(s)')::TEXT;
    END IF;
  END LOOP;
  
  -- Résumé final
  IF total_created = 0 AND total_deleted = 0 THEN
    RETURN QUERY SELECT 
      'INFO'::TEXT,
      'Summary'::TEXT,
      NULL::DATE,
      'No changes needed - all occurrences are correct'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      'INFO'::TEXT,
      'Summary'::TEXT,
      NULL::DATE,
      ('Total: ' || total_created || ' created, ' || total_deleted || ' deleted')::TEXT;
  END IF;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.fix_recurring_costs_simple() IS 
'Fonction simplifiée pour corriger tous les coûts récurrents.
Version robuste qui trouve tous les templates récurrents et corrige leurs occurrences.
Supprime les lignes futures et orphelines, crée les lignes manquantes.';

-- Exemple d'utilisation :
-- SELECT * FROM fix_recurring_costs_simple();

-- Fonction générale pour corriger TOUS les coûts récurrents
-- Cette fonction :
-- 1. Supprime les lignes qui ne devraient pas exister (futures, orphelines, doublons)
-- 2. Crée les lignes manquantes avec les bonnes dates de facturation
-- 3. S'assure que chaque template a exactement les occurrences qu'il devrait avoir
-- Usage: SELECT * FROM fix_all_recurring_costs();

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.fix_all_recurring_costs();

CREATE FUNCTION public.fix_all_recurring_costs()
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  action_type TEXT,
  billing_date DATE,
  status TEXT,
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
  existing_occurrence RECORD;
  should_exist BOOLEAN;
  deleted_count INTEGER := 0;
  created_count INTEGER := 0;
  total_deleted INTEGER := 0;
  total_created INTEGER := 0;
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
      
      -- Déterminer si cette occurrence devrait exister
      -- Elle devrait exister si la date cible est passée ou aujourd'hui
      should_exist := (target_date <= current_date_val);
      
      -- Trouver toutes les occurrences existantes pour ce mois et ce template
      FOR existing_occurrence IN 
        SELECT wc.* FROM public.webservice_costs wc
        WHERE (
          -- Occurrences liées au template
          (wc.recurring_template_id = template_record.id
           AND wc.billing_date >= month_start
           AND wc.billing_date <= month_end)
          OR
          -- Lignes orphelines (même service, même date, mais sans recurring_template_id ou avec un mauvais ID)
          (wc.service_name = template_record.service_name
           AND wc.billing_date = target_date
           AND (wc.recurring_template_id IS NULL OR wc.recurring_template_id != template_record.id)
           AND wc.is_recurring = false)
        )
      LOOP
        -- Si l'occurrence existe mais ne devrait pas (date future)
        IF NOT should_exist THEN
          -- Supprimer les lignes futures qui ne devraient pas exister
          DELETE FROM public.webservice_costs WHERE id = existing_occurrence.id;
          deleted_count := deleted_count + 1;
          total_deleted := total_deleted + 1;
          
          RETURN QUERY SELECT 
            template_record.id,
            template_record.service_name::TEXT,
            'DELETED'::TEXT,
            existing_occurrence.billing_date,
            'FUTURE_DATE'::TEXT,
            ('Deleted future occurrence that should not exist yet (date: ' || existing_occurrence.billing_date || ')')::TEXT;
        -- Si l'occurrence existe mais n'a pas le bon recurring_template_id
        ELSIF existing_occurrence.recurring_template_id IS NULL OR existing_occurrence.recurring_template_id != template_record.id THEN
          -- Supprimer la ligne orpheline
          DELETE FROM public.webservice_costs WHERE id = existing_occurrence.id;
          deleted_count := deleted_count + 1;
          total_deleted := total_deleted + 1;
          
          RETURN QUERY SELECT 
            template_record.id,
            template_record.service_name::TEXT,
            'DELETED'::TEXT,
            existing_occurrence.billing_date,
            'ORPHAN'::TEXT,
            ('Deleted orphan occurrence without correct recurring_template_id')::TEXT;
        -- Si l'occurrence existe mais a la mauvaise date (pas exactement target_date)
        ELSIF existing_occurrence.billing_date != target_date AND existing_occurrence.recurring_template_id = template_record.id THEN
          -- Supprimer la ligne avec la mauvaise date
          DELETE FROM public.webservice_costs WHERE id = existing_occurrence.id;
          deleted_count := deleted_count + 1;
          total_deleted := total_deleted + 1;
          
          RETURN QUERY SELECT 
            template_record.id,
            template_record.service_name::TEXT,
            'DELETED'::TEXT,
            existing_occurrence.billing_date,
            'WRONG_DATE'::TEXT,
            ('Deleted occurrence with wrong date (was: ' || existing_occurrence.billing_date || ', should be: ' || target_date || ')')::TEXT;
        END IF;
      END LOOP;
      
      -- Si l'occurrence devrait exister mais n'existe pas (ou a été supprimée)
      IF should_exist THEN
        -- Vérifier si une occurrence correcte existe maintenant (après les suppressions)
        IF NOT EXISTS (
          SELECT 1 FROM public.webservice_costs wc
          WHERE wc.recurring_template_id = template_record.id
            AND wc.billing_date = target_date
        ) THEN
          -- Créer la nouvelle occurrence avec les bonnes données
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
            template_record.id,
            template_record.service_name::TEXT,
            'CREATED'::TEXT,
            target_date,
            'SUCCESS'::TEXT,
            ('Created missing occurrence for ' || target_date)::TEXT;
        END IF;
      END IF;
      
      -- Passer au mois suivant
      month_to_check := month_to_check + INTERVAL '1 month';
    END LOOP;
    
    -- Supprimer toutes les occurrences futures qui ne devraient pas exister
    -- (au cas où il y en aurait qui n'ont pas été détectées dans la boucle)
    DELETE FROM public.webservice_costs wc
    WHERE wc.recurring_template_id = template_record.id
      AND wc.billing_date > current_date_val;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      total_deleted := total_deleted + deleted_count;
      RETURN QUERY SELECT 
        template_record.id,
        template_record.service_name::TEXT,
        'DELETED'::TEXT,
        NULL::DATE,
        'FUTURE_OCCURRENCES'::TEXT,
        ('Deleted ' || deleted_count || ' future occurrence(s)')::TEXT;
    END IF;
  END LOOP;
  
  -- Retourner un résumé si aucun template n'a été trouvé
  IF total_created = 0 AND total_deleted = 0 THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      'Summary'::TEXT,
      'INFO'::TEXT,
      NULL::DATE,
      'NO_CHANGES'::TEXT,
      'No active recurring templates found or all occurrences are correct'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      NULL::UUID,
      'Summary'::TEXT,
      'INFO'::TEXT,
      NULL::DATE,
      'COMPLETED'::TEXT,
      ('Total: ' || total_created || ' created, ' || total_deleted || ' deleted')::TEXT;
  END IF;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.fix_all_recurring_costs() IS 
'Fonction générale pour corriger TOUS les coûts récurrents.
Supprime les lignes qui ne devraient pas exister (futures, orphelines, mauvaises dates).
Crée les lignes manquantes avec les bonnes dates de facturation.
S''assure que chaque template a exactement les occurrences qu''il devrait avoir jusqu''à aujourd''hui.';

-- Exemple d'utilisation :
-- SELECT * FROM fix_all_recurring_costs();

-- Pour voir seulement les créations :
-- SELECT * FROM fix_all_recurring_costs() WHERE action_type = 'CREATED';

-- Pour voir seulement les suppressions :
-- SELECT * FROM fix_all_recurring_costs() WHERE action_type = 'DELETED';

-- Pour voir un résumé par template :
-- SELECT 
--   template_name,
--   COUNT(*) FILTER (WHERE action_type = 'CREATED') as created_count,
--   COUNT(*) FILTER (WHERE action_type = 'DELETED') as deleted_count
-- FROM fix_all_recurring_costs()
-- WHERE template_id IS NOT NULL
-- GROUP BY template_name;

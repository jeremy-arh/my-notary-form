-- Script SQL CORRECT pour corriger les coûts récurrents
-- RÈGLE IMPORTANTE : Ne pas créer d'occurrence le même mois que le template !
-- Une occurrence par mois SUIVANT seulement

DO $$
DECLARE
  template_record RECORD;
  current_date_val DATE;
  target_date DATE;
  month_start DATE;
  month_end DATE;
  billing_day INTEGER;
  month_to_check DATE;
  template_month_start DATE;
  template_month_end DATE;
  existing_count INTEGER;
  deleted_count INTEGER;
  created_count INTEGER := 0;
  total_created INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  current_date_val := CURRENT_DATE;
  
  RAISE NOTICE '=== Début de la correction des coûts récurrents ===';
  RAISE NOTICE 'Date actuelle: %', current_date_val;
  
  -- Parcourir TOUS les templates récurrents
  FOR template_record IN 
    SELECT * FROM public.webservice_costs 
    WHERE is_recurring = true 
      AND billing_period = 'monthly'
      AND (recurring_template_id IS NULL OR parent_cost_id IS NULL)
    ORDER BY service_name, billing_date
  LOOP
    RAISE NOTICE '--- Traitement du template: % (ID: %) ---', template_record.service_name, template_record.id;
    RAISE NOTICE 'Date de facturation du template: %', template_record.billing_date;
    
    -- Extraire le jour du mois
    billing_day := EXTRACT(DAY FROM template_record.billing_date)::INTEGER;
    
    -- Déterminer le mois du template
    template_month_start := DATE_TRUNC('month', template_record.billing_date)::DATE;
    template_month_end := (template_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Commencer depuis le MOIS SUIVANT le template (pas le même mois !)
    month_to_check := template_month_start + INTERVAL '1 month';
    
    created_count := 0;
    
    -- Supprimer TOUTES les occurrences dans le même mois que le template
    DELETE FROM public.webservice_costs wc
    WHERE wc.service_name = template_record.service_name
      AND wc.billing_date >= template_month_start
      AND wc.billing_date <= template_month_end
      AND wc.is_recurring = false
      AND wc.id != template_record.id;  -- Ne pas supprimer le template lui-même
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      total_deleted := total_deleted + deleted_count;
      RAISE NOTICE '  ✓ Supprimé % occurrence(s) du même mois que le template', deleted_count;
    END IF;
    
    -- Parcourir tous les mois SUIVANTS jusqu'à aujourd'hui
    WHILE month_to_check <= DATE_TRUNC('month', current_date_val)::DATE LOOP
      month_start := month_to_check;
      month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      
      -- Calculer la date cible pour ce mois (même jour que le template)
      target_date := month_start + (billing_day - 1) * INTERVAL '1 day';
      
      -- Si le jour n'existe pas dans le mois, prendre le dernier jour
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
            RAISE NOTICE '  → Supprimé % ligne(s) orpheline(s) pour le %', deleted_count, target_date;
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
          RAISE NOTICE '  ✓ Créé occurrence pour le %', target_date;
        ELSE
          RAISE NOTICE '  → Occurrence existe déjà pour le %', target_date;
        END IF;
      END IF;
      
      -- Passer au mois suivant
      month_to_check := month_to_check + INTERVAL '1 month';
    END LOOP;
    
    RAISE NOTICE '  Total créé pour ce template: %', created_count;
    
    -- Supprimer TOUTES les occurrences futures pour ce template (dates > aujourd'hui)
    DELETE FROM public.webservice_costs wc
    WHERE wc.recurring_template_id = template_record.id
      AND wc.billing_date > current_date_val;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      total_deleted := total_deleted + deleted_count;
      RAISE NOTICE '  ✓ Supprimé % occurrence(s) future(s)', deleted_count;
    END IF;
    
    -- Supprimer les doublons : si plusieurs occurrences existent pour la même date, garder seulement celle avec recurring_template_id
    DELETE FROM public.webservice_costs wc1
    WHERE wc1.is_recurring = false
      AND wc1.service_name = template_record.service_name
      AND EXISTS (
        SELECT 1 FROM public.webservice_costs wc2
        WHERE wc2.recurring_template_id = template_record.id
          AND wc2.billing_date = wc1.billing_date
          AND wc2.id != wc1.id
      )
      AND (wc1.recurring_template_id IS NULL OR wc1.recurring_template_id != template_record.id);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      total_deleted := total_deleted + deleted_count;
      RAISE NOTICE '  ✓ Supprimé % doublon(s)', deleted_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== Résumé ===';
  RAISE NOTICE 'Total créé: %', total_created;
  RAISE NOTICE 'Total supprimé: %', total_deleted;
  RAISE NOTICE '=== Fin de la correction ===';
END $$;

-- Vérification: Voir le résultat final
SELECT 
  service_name,
  billing_date,
  is_recurring,
  recurring_template_id,
  parent_cost_id,
  cost_amount,
  description
FROM public.webservice_costs
WHERE service_name IN ('One notary', 'Vercel', 'Shine')
ORDER BY service_name, billing_date;

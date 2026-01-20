-- Script SQL DIRECT pour corriger les coûts récurrents
-- Exécutez ce script directement dans le SQL Editor
-- Il va corriger tous les templates récurrents visibles

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
    RAISE NOTICE 'Jour de facturation: %', billing_day;
    
    -- Commencer depuis le mois du template
    template_month_start := DATE_TRUNC('month', template_record.billing_date)::DATE;
    month_to_check := template_month_start;
    
    created_count := 0;
    
    -- Parcourir tous les mois depuis le template jusqu'à aujourd'hui
    WHILE month_to_check <= DATE_TRUNC('month', current_date_val)::DATE LOOP
      month_start := month_to_check;
      month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      
      -- Calculer la date cible pour ce mois
      target_date := month_start + (billing_day - 1) * INTERVAL '1 day';
      
      -- Si le jour n'existe pas dans le mois, prendre le dernier jour
      IF target_date > month_end THEN
        target_date := month_end;
      END IF;
      
      -- Ne créer que si la date est passée ou aujourd'hui
      IF target_date <= current_date_val THEN
        -- Vérifier si une occurrence correcte existe déjà
        SELECT COUNT(*) INTO existing_count
        FROM public.webservice_costs wc
        WHERE wc.recurring_template_id = template_record.id
          AND wc.billing_date = target_date;
        
        -- Si aucune occurrence correcte n'existe
        IF existing_count = 0 THEN
          RAISE NOTICE '  → Pas d''occurrence pour le %', target_date;
          
          -- Supprimer les lignes orphelines
          DELETE FROM public.webservice_costs wc
          WHERE wc.service_name = template_record.service_name
            AND wc.billing_date = target_date
            AND wc.is_recurring = false
            AND (wc.recurring_template_id IS NULL OR wc.recurring_template_id != template_record.id);
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          IF deleted_count > 0 THEN
            total_deleted := total_deleted + deleted_count;
            RAISE NOTICE '    ✓ Supprimé % ligne(s) orpheline(s)', deleted_count;
          END IF;
          
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
            false,
            true,
            template_record.id,
            template_record.id
          );
          
          created_count := created_count + 1;
          total_created := total_created + 1;
          RAISE NOTICE '    ✓ Créé occurrence pour le %', target_date;
        ELSE
          RAISE NOTICE '  → Occurrence existe déjà pour le %', target_date;
        END IF;
      END IF;
      
      -- Passer au mois suivant
      month_to_check := month_to_check + INTERVAL '1 month';
    END LOOP;
    
    RAISE NOTICE '  Total créé pour ce template: %', created_count;
    
    -- Supprimer TOUTES les occurrences futures pour ce template
    DELETE FROM public.webservice_costs wc
    WHERE wc.recurring_template_id = template_record.id
      AND wc.billing_date > current_date_val;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN
      total_deleted := total_deleted + deleted_count;
      RAISE NOTICE '  ✓ Supprimé % occurrence(s) future(s)', deleted_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== Résumé ===';
  RAISE NOTICE 'Total créé: %', total_created;
  RAISE NOTICE 'Total supprimé: %', total_deleted;
  RAISE NOTICE '=== Fin de la correction ===';
END $$;

-- Vérification: Voir le résultat
SELECT 
  service_name,
  billing_date,
  is_recurring,
  recurring_template_id,
  parent_cost_id,
  cost_amount
FROM public.webservice_costs
WHERE service_name IN ('One notary', 'Vercel', 'Shine')
ORDER BY service_name, billing_date;

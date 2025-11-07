-- Migration pour ajouter la récurrence automatique des webservice_costs
-- À exécuter dans Supabase SQL Editor

-- Ajouter les colonnes nécessaires à la table webservice_costs
ALTER TABLE public.webservice_costs 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS recurring_template_id UUID,
ADD COLUMN IF NOT EXISTS parent_cost_id UUID REFERENCES public.webservice_costs(id);

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_webservice_costs_recurring ON public.webservice_costs(is_recurring, is_active);
CREATE INDEX IF NOT EXISTS idx_webservice_costs_template ON public.webservice_costs(recurring_template_id);

-- Fonction pour générer les coûts récurrents mensuels
CREATE OR REPLACE FUNCTION generate_recurring_webservice_costs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  template_record RECORD;
  current_date_val DATE;
  target_date DATE;
  last_generated_date DATE;
  month_start DATE;
  month_end DATE;
  billing_day INTEGER;
BEGIN
  -- Parcourir tous les templates récurrents actifs
  FOR template_record IN 
    SELECT * FROM public.webservice_costs 
    WHERE is_recurring = true 
      AND is_active = true 
      AND billing_period = 'monthly'
      AND recurring_template_id IS NULL  -- Seulement les templates (pas les occurrences)
  LOOP
    -- Déterminer la date cible pour ce mois (même jour du mois)
    current_date_val := CURRENT_DATE;
    month_start := DATE_TRUNC('month', current_date_val)::DATE;
    month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    billing_day := EXTRACT(DAY FROM template_record.billing_date)::INTEGER;
    
    -- Calculer la date cible
    target_date := month_start + (billing_day - 1) * INTERVAL '1 day';
    
    -- Si le jour n'existe pas dans le mois actuel (ex: 31 février), prendre le dernier jour
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
    END IF;
  END LOOP;
END;
$$;

-- Créer un cron job (nécessite pg_cron extension)
-- Note: Cette commande doit être exécutée avec les droits superuser
-- SELECT cron.schedule(
--   'generate-recurring-webservice-costs',
--   '0 2 * * *',  -- Tous les jours à 2h du matin
--   $$SELECT generate_recurring_webservice_costs()$$
-- );


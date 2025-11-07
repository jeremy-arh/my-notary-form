# Fonction Edge pour générer les coûts récurrents

Cette fonction génère automatiquement les lignes de coûts webservice récurrents chaque mois.

## Déploiement

```bash
supabase functions deploy generate-recurring-costs
```

## Configuration du Cron

Pour exécuter cette fonction automatiquement chaque jour, configurez un cron job dans Supabase Dashboard :

1. Allez dans Database > Cron Jobs
2. Créez un nouveau cron job avec :
   - **Schedule**: `0 2 * * *` (tous les jours à 2h du matin)
   - **Function**: `generate-recurring-costs`
   - **Payload**: `{}`

Ou utilisez pg_cron directement dans SQL :

```sql
SELECT cron.schedule(
  'generate-recurring-webservice-costs',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-recurring-costs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

## Fonctionnement

1. La fonction récupère tous les templates récurrents actifs (`is_recurring = true`, `is_active = true`)
2. Pour chaque template, elle vérifie si une ligne existe déjà pour le mois en cours
3. Si aucune ligne n'existe et que la date cible est passée, elle crée une nouvelle ligne
4. Les lignes générées ont `is_recurring = false` et sont liées au template via `recurring_template_id`


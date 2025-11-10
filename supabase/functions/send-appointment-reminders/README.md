# Send Appointment Reminders Edge Function

Cette fonction Edge envoie des rappels de rendez-vous aux notaires.

## Fonctionnalités

- **Rappel la veille** : Envoie un email à tous les notaires qui ont un rendez-vous demain
- **Rappel 1 heure avant** : Envoie un email à tous les notaires qui ont un rendez-vous dans environ 1 heure (±5 minutes de tolérance)

## Déploiement

### 1. Déployer la fonction

```bash
supabase functions deploy send-appointment-reminders
```

### 2. Configurer le cron job

Cette fonction doit être exécutée périodiquement. Vous pouvez la configurer de deux façons :

#### Option A : Utiliser pg_cron (recommandé)

Exécutez ce SQL dans l'éditeur SQL de Supabase :

```sql
-- Créer une fonction pour appeler l'Edge Function
CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response http_response;
BEGIN
  SELECT * INTO response
  FROM http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Planifier l'exécution toutes les heures
SELECT cron.schedule(
  'send-appointment-reminders',
  '0 * * * *', -- Toutes les heures à minute 0
  $$SELECT public.send_appointment_reminders()$$
);
```

#### Option B : Utiliser un service externe (cron-job.org, EasyCron, etc.)

Configurez un cron job externe pour appeler l'URL de l'Edge Function toutes les heures :

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders
```

Avec les en-têtes :
- `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
- `Content-Type: application/json`

## Configuration

### Variables d'environnement requises

- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase (pour accéder à la base de données)

### Variables d'environnement utilisées par send-transactional-email

- `SENDGRID_API_KEY` : Clé API SendGrid
- `SENDGRID_FROM_EMAIL` : Email expéditeur
- `SENDGRID_FROM_NAME` : Nom de l'expéditeur
- `NOTARY_DASHBOARD_URL` : URL du dashboard notaire (pour les liens dans les emails)

## Logique de la fonction

1. **Rappel la veille** :
   - Trouve tous les rendez-vous avec `appointment_date = demain`
   - Filtre par statut `confirmed` ou `accepted`
   - Envoie un email de type `appointment_reminder_day_before` à chaque notaire assigné

2. **Rappel 1 heure avant** :
   - Trouve tous les rendez-vous avec `appointment_date = aujourd'hui`
   - Filtre par statut `confirmed` ou `accepted`
   - Filtre les rendez-vous dont l'heure est dans environ 1 heure (±5 minutes)
   - Envoie un email de type `appointment_reminder_one_hour_before` à chaque notaire assigné

## Notes

- La fonction utilise une tolérance de ±5 minutes pour le rappel 1 heure avant
- Les emails sont envoyés de manière asynchrone (ne bloque pas si un email échoue)
- Les erreurs sont loggées mais n'interrompent pas le processus
- La fonction peut être appelée manuellement pour tester

## Test manuel

Pour tester la fonction manuellement :

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Monitoring

Vérifiez les logs de la fonction dans le dashboard Supabase :
- **Edge Functions** > **send-appointment-reminders** > **Logs**

Les logs incluent :
- Nombre de rendez-vous trouvés pour demain
- Nombre de rendez-vous trouvés dans 1 heure
- Succès/échec de l'envoi de chaque email


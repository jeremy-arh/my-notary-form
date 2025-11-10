# Configuration du Cron Job Supabase pour les Rappels de Rendez-vous

## 📋 Vue d'ensemble

Supabase propose une intégration **Cron** basée sur l'extension `pg_cron` qui permet de programmer des tâches récurrentes directement dans votre base de données PostgreSQL. Nous allons utiliser cette fonctionnalité pour envoyer automatiquement les rappels de rendez-vous aux notaires.

## ✅ Prérequis

1. **Activer l'intégration Cron dans Supabase** :
   - Allez dans **Supabase Dashboard** > **Integrations**
   - Cliquez sur **Cron** (si ce n'est pas déjà installé)
   - Cliquez sur **Install** pour activer l'intégration

2. **Activer l'extension pg_net** (requise pour les appels HTTP) :
   - Allez dans **Supabase Dashboard** > **Database** > **Extensions**
   - Recherchez **pg_net** et activez l'extension
   - Ou exécutez dans le SQL Editor : `CREATE EXTENSION IF NOT EXISTS pg_net;`

3. **Déployer l'Edge Function** :
   ```bash
   supabase functions deploy send-appointment-reminders
   ```

4. **Récupérer vos identifiants** :
   - **Project Ref** : Supabase Dashboard > **Project Settings** > **General** > **Reference ID**
   - **Service Role Key** : Supabase Dashboard > **Project Settings** > **API** > **service_role key** (⚠️ Gardez-la secrète !)

## 🔧 Configuration

### Option 1 : Via SQL Editor (Recommandé)

1. **Ouvrez le SQL Editor** dans Supabase Dashboard

2. **Exécutez le script SQL** `supabase-appointment-reminders-cron-setup.sql` après avoir remplacé les placeholders :
   - `YOUR_PROJECT_REF` → Votre référence de projet Supabase
   - `YOUR_SERVICE_ROLE_KEY` → Votre clé de service role

3. **Vérifiez que les cron jobs sont créés** :
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE 'appointment-reminders%';
   ```

### Option 2 : Via Dashboard (Interface graphique)

1. **Allez dans** **Database** > **Cron Jobs** (ou **Integrations** > **Cron** > **Jobs**)

2. **Cliquez sur "New Cron Job"**

3. **Configurez le cron job** :
   - **Name** : `appointment-reminders-hourly`
   - **Schedule** : `0 * * * *` (toutes les heures à minute 0)
   - **SQL Command** :
     ```sql
     SELECT net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
         'apikey', 'YOUR_SERVICE_ROLE_KEY'
       ),
       body := '{}'::jsonb
     );
     ```
   - Remplacez `YOUR_PROJECT_REF` et `YOUR_SERVICE_ROLE_KEY`

4. **Cliquez sur "Create"**

## 📅 Fréquence recommandée

### Option A : Toutes les heures (Recommandé pour débuter)
- **Schedule** : `0 * * * *`
- **Avantages** : Moins d'appels API, suffisant pour la plupart des cas
- **Inconvénients** : Les rappels "1 heure avant" peuvent avoir une précision de ±30 minutes

### Option B : Toutes les 15 minutes (Plus précis)
- **Schedule** : `*/15 * * * *`
- **Avantages** : Précision de ±7.5 minutes pour les rappels "1 heure avant"
- **Inconvénients** : Plus d'appels API (mais la fonction évite les doublons)

### Option C : Toutes les 5 minutes (Très précis)
- **Schedule** : `*/5 * * * *`
- **Avantages** : Précision de ±2.5 minutes pour les rappels "1 heure avant"
- **Inconvénients** : Encore plus d'appels API

**Recommandation** : Commencez avec **toutes les heures** (`0 * * * *`). Si vous avez besoin de plus de précision, passez à **toutes les 15 minutes** (`*/15 * * * *`).

## 🔍 Vérification

### Vérifier que les cron jobs sont actifs

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database,
  username
FROM cron.job 
WHERE jobname LIKE 'appointment-reminders%';
```

### Voir l'historique d'exécution

```sql
SELECT 
  jobid,
  job_pid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname LIKE 'appointment-reminders%'
)
ORDER BY start_time DESC 
LIMIT 20;
```

### Tester manuellement l'Edge Function

```sql
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
    'apikey', 'YOUR_SERVICE_ROLE_KEY'
  ),
  body := '{}'::jsonb
);
```

### Vérifier les logs de l'Edge Function

1. Allez dans **Supabase Dashboard** > **Edge Functions** > **send-appointment-reminders**
2. Cliquez sur **Logs** pour voir les exécutions
3. Vérifiez que les rappels sont envoyés correctement

## 🛠️ Gestion des cron jobs

### Modifier un cron job existant

```sql
-- Désactiver un cron job
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'appointment-reminders-hourly'),
  schedule := NULL,  -- Garder le schedule actuel
  command := NULL,   -- Garder la commande actuelle
  database := NULL,  -- Garder la base de données actuelle
  active := false    -- Désactiver
);

-- Réactiver un cron job
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'appointment-reminders-hourly'),
  active := true
);
```

### Supprimer un cron job

```sql
SELECT cron.unschedule('appointment-reminders-hourly');
```

### Modifier le schedule d'un cron job

```sql
-- Changer pour toutes les 15 minutes
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'appointment-reminders-hourly'),
  schedule := '*/15 * * * *'
);
```

## 🐛 Dépannage

### Le cron job ne s'exécute pas

1. **Vérifiez que l'intégration Cron est activée** :
   - Allez dans **Integrations** > **Cron**
   - Vérifiez que l'état est "Installed"

2. **Vérifiez que pg_net est activé** :
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

3. **Vérifiez que le cron job est actif** :
   ```sql
   SELECT jobname, active FROM cron.job WHERE jobname LIKE 'appointment-reminders%';
   ```

4. **Vérifiez les erreurs dans l'historique** :
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'appointment-reminders%')
   AND status = 'failed'
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

### Les rappels ne sont pas envoyés

1. **Vérifiez les logs de l'Edge Function** :
   - Allez dans **Edge Functions** > **send-appointment-reminders** > **Logs**
   - Cherchez les erreurs ou les messages de débogage

2. **Vérifiez que l'Edge Function est déployée** :
   ```bash
   supabase functions list
   ```

3. **Vérifiez que les variables d'environnement sont configurées** :
   - Allez dans **Edge Functions** > **send-appointment-reminders** > **Settings**
   - Vérifiez que `SENDGRID_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` sont définies

4. **Testez manuellement l'Edge Function** (voir section "Vérification" ci-dessus)

### Erreur "extension pg_net does not exist"

1. **Activez l'extension pg_net** :
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

2. **Vérifiez que l'extension est activée** :
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

### Erreur "permission denied for schema cron"

1. **Vérifiez les permissions** :
   ```sql
   GRANT USAGE ON SCHEMA cron TO postgres;
   GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;
   ```

## 📚 Ressources

- [Documentation Supabase Cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Documentation pg_cron](https://github.com/citusdata/pg_cron)
- [Documentation pg_net](https://github.com/supabase/pg_net)

## ✅ Checklist de configuration

- [ ] Intégration Cron activée dans Supabase Dashboard
- [ ] Extension pg_net activée
- [ ] Edge Function `send-appointment-reminders` déployée
- [ ] Variables d'environnement configurées (SENDGRID_API_KEY, etc.)
- [ ] Script SQL exécuté avec les bons identifiants
- [ ] Cron job créé et actif
- [ ] Test manuel réussi
- [ ] Vérification des logs d'exécution

Une fois tous ces éléments vérifiés, les rappels de rendez-vous seront envoyés automatiquement aux notaires ! 🎉


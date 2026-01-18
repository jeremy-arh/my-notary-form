# Configuration de la Séquence d'Emails de Relance (Abandoned Cart)

## 📋 Vue d'ensemble

Ce système envoie automatiquement une séquence d'emails de relance aux clients qui ont commencé à remplir un formulaire mais n'ont pas finalisé leur commande. Les emails sont envoyés selon le calendrier suivant :

- **H+1** : 1 heure après la création du draft
- **J+1** : 1 jour après
- **J+3** : 3 jours après
- **J+7** : 7 jours après
- **J+10** : 10 jours après
- **J+15** : 15 jours après
- **J+30** : 30 jours après (dernier email)

## ✅ Prérequis

1. **Activer l'intégration Cron dans Supabase** :
   - Allez dans **Supabase Dashboard** > **Integrations**
   - Cliquez sur **Cron** (si ce n'est pas déjà installé)
   - Cliquez sur **Install** pour activer l'intégration

2. **Activer l'extension pg_net** (requise pour les appels HTTP) :
   - Allez dans **Supabase Dashboard** > **Database** > **Extensions**
   - Recherchez **pg_net** et activez l'extension
   - Ou exécutez dans le SQL Editor : `CREATE EXTENSION IF NOT EXISTS pg_net;`

3. **Déployer les Edge Functions** :
   ```bash
   cd supabase
   supabase functions deploy send-abandoned-cart-emails
   supabase functions deploy send-transactional-email
   ```

4. **Récupérer vos identifiants** :
   - **Project Ref** : Supabase Dashboard > **Project Settings** > **General** > **Reference ID**
   - **Service Role Key** : Supabase Dashboard > **Project Settings** > **API** > **service_role key** (⚠️ Gardez-la secrète !)

## 🔧 Configuration

### 1. Exécuter les migrations SQL

Exécutez les fichiers de migration suivants dans le Supabase SQL Editor :

1. `supabase/migrations/20250106_create_email_sequence_tracking.sql` - Crée la table de suivi des emails
2. `supabase/migrations/20250106_setup_abandoned_cart_cron.sql` - Configure le cron job (⚠️ Remplacez les placeholders avant d'exécuter)

### 2. Configurer le Cron Job

#### Option A : Via SQL Editor (Recommandé)

1. Ouvrez le fichier `supabase/migrations/20250106_setup_abandoned_cart_cron.sql`
2. Remplacez les placeholders :
   - `YOUR_PROJECT_REF` → Votre référence de projet Supabase
   - `YOUR_SERVICE_ROLE_KEY` → Votre clé de service role
3. Exécutez le script dans le Supabase SQL Editor

#### Option B : Via Dashboard

1. Allez dans **Database** > **Cron Jobs** (ou **Integrations** > **Cron** > **Jobs**)
2. Cliquez sur **New Cron Job**
3. Configurez le cron job :
   - **Schedule** : `0 * * * *` (toutes les heures à minute 0)
   - **SQL Command** :
     ```sql
     SELECT net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-abandoned-cart-emails',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
         'apikey', 'YOUR_SERVICE_ROLE_KEY'
       ),
       body := '{}'::jsonb
     );
     ```
   - Remplacez `YOUR_PROJECT_REF` et `YOUR_SERVICE_ROLE_KEY`

## 🔍 Vérification

### Vérifier que le cron job est actif

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database,
  username
FROM cron.job 
WHERE jobname = 'send-abandoned-cart-emails';
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
  SELECT jobid FROM cron.job WHERE jobname = 'send-abandoned-cart-emails'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Vérifier les emails envoyés

```sql
SELECT 
  est.*,
  fd.email,
  fd.first_name,
  fd.last_name,
  fd.created_at as draft_created_at
FROM email_sequence_tracking est
JOIN form_draft fd ON est.form_draft_id = fd.id
ORDER BY est.sent_at DESC
LIMIT 20;
```

## 📧 Fonctionnement

1. **Création d'un draft** : Quand un client commence à remplir le formulaire, une entrée est créée dans `form_draft`

2. **Vérification périodique** : Toutes les heures, le cron job appelle la fonction `send-abandoned-cart-emails`

3. **Envoi des emails** : La fonction :
   - Trouve les `form_draft` qui doivent recevoir un email selon le timing
   - Vérifie qu'ils n'ont pas déjà reçu cet email spécifique
   - Vérifie qu'ils n'ont pas payé (pas de submission avec status != 'pending_payment')
   - Envoie l'email via `send-transactional-email`
   - Enregistre l'envoi dans `email_sequence_tracking`

4. **Suppression après paiement** : Quand un client paye, la fonction `verify-payment` supprime automatiquement l'entrée `form_draft` correspondante

## 🛠️ Structure des fichiers

- `supabase/migrations/20250106_create_email_sequence_tracking.sql` - Table de suivi
- `supabase/migrations/20250106_setup_abandoned_cart_cron.sql` - Configuration du cron
- `supabase/functions/send-abandoned-cart-emails/index.ts` - Fonction Edge pour envoyer les emails
- `supabase/functions/send-transactional-email/index.ts` - Fonction Edge pour les templates d'emails (mise à jour avec les nouveaux types)
- `supabase/functions/verify-payment/index.ts` - Fonction Edge mise à jour pour supprimer form_draft après paiement

## 📝 Notes importantes

- Les emails ne sont envoyés qu'aux `form_draft` qui ont une adresse email
- Un client ne recevra chaque email qu'une seule fois
- Si un client paye, son `form_draft` est supprimé et il ne recevra plus d'emails de relance
- Le système vérifie automatiquement si un client a déjà payé avant d'envoyer un email

## 🔄 Fréquence recommandée

- **Toutes les heures** (`0 * * * *`) : Recommandé pour débuter
- **Toutes les 30 minutes** (`*/30 * * * *`) : Pour plus de précision sur H+1
- **Toutes les 15 minutes** (`*/15 * * * *`) : Pour une précision maximale

**Recommandation** : Commencez avec **toutes les heures** (`0 * * * *`). C'est suffisant pour la plupart des cas d'usage.

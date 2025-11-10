# Configuration des notifications email pour les notaires

Ce guide explique comment configurer les notifications email pour les notaires.

## Fonctionnalités

1. **Notification de nouvelle soumission** : Tous les notaires actifs reçoivent un email lorsqu'une nouvelle soumission est enregistrée
2. **Notification de message reçu** : Les notaires reçoivent un email lorsqu'ils reçoivent un message d'un client
3. **Rappel la veille** : Les notaires reçoivent un email la veille d'un rendez-vous qu'ils ont accepté
4. **Rappel 1 heure avant** : Les notaires reçoivent un email 1 heure avant un rendez-vous qu'ils ont accepté

## Configuration

### 1. Déployer les Edge Functions

#### Déployer send-transactional-email (si pas déjà fait)

```bash
supabase functions deploy send-transactional-email
```

#### Déployer send-appointment-reminders

```bash
supabase functions deploy send-appointment-reminders
```

### 2. Configurer les variables d'environnement

Dans le dashboard Supabase, allez dans **Edge Functions** > **Settings** > **Secrets** et ajoutez :

- `SENDGRID_API_KEY` : Votre clé API SendGrid
- `SENDGRID_FROM_EMAIL` : Email expéditeur (doit être vérifié dans SendGrid)
- `SENDGRID_FROM_NAME` : Nom de l'expéditeur (ex: "MY NOTARY")
- `NOTARY_DASHBOARD_URL` : URL du dashboard notaire (ex: "https://notary.mynotary.io")
- `CLIENT_DASHBOARD_URL` : URL du dashboard client (ex: "https://client.mynotary.io")
- `SUPABASE_URL` : URL de votre projet Supabase (déjà configurée)
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase (déjà configurée)

### 3. Configurer le cron job Supabase pour les rappels ✅

**Supabase propose une intégration Cron native** basée sur `pg_cron` qui permet de programmer des tâches récurrentes directement dans votre base de données.

#### 🔴 Action requise : Configurer le cron job Supabase

Consultez le guide complet : **`SUPABASE_CRON_SETUP.md`**

**Étapes rapides :**

1. **Activer l'intégration Cron** :
   - Allez dans **Supabase Dashboard** > **Integrations** > **Cron**
   - Cliquez sur **Install** si ce n'est pas déjà fait

2. **Activer l'extension pg_net** :
   - Allez dans **Database** > **Extensions**
   - Activez **pg_net** (requis pour les appels HTTP depuis pg_cron)

3. **Exécuter le script SQL** :
   - Ouvrez le **SQL Editor** dans Supabase Dashboard
   - Exécutez `supabase-appointment-reminders-cron-setup.sql`
   - **Remplacez** `YOUR_PROJECT_REF` et `YOUR_SERVICE_ROLE_KEY` par vos valeurs réelles

4. **Vérifier que le cron job est créé** :
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE 'appointment-reminders%';
   ```

**Configuration recommandée :**
- **Fréquence** : Toutes les heures (`0 * * * *`)
- **Alternative** : Toutes les 15 minutes (`*/15 * * * *`) pour plus de précision

**⚠️ Sans cette configuration, les rappels de rendez-vous ne seront PAS envoyés automatiquement.**

#### Alternative : Service externe (si vous préférez)

Si vous préférez utiliser un service externe au lieu de pg_cron, consultez : **`CRON_JOB_SETUP_GUIDE.md`**

### 4. Exécuter le script SQL (Optionnel)

Si vous voulez utiliser la fonction `get_appointments_needing_reminders()` pour suivre les rappels, exécutez le script SQL :

```sql
-- Exécutez le contenu de supabase-appointment-reminders-cron-setup.sql
```

Cette fonction peut être utile pour :
- Vérifier quels rendez-vous ont besoin de rappels
- Créer une interface admin pour voir les rappels à envoyer
- Intégrer avec un système externe

## Fonctionnement

### 1. Notification de nouvelle soumission

**Déclencheur** : Lors de la création d'une soumission dans `create-checkout-session`

**Processus** :
1. La soumission est créée avec le statut `pending_payment`
2. Tous les notaires actifs sont récupérés
3. Un email de type `new_submission_available` est envoyé à chaque notaire actif
4. L'email contient les détails de la soumission (client, date, heure, adresse)

**Code** : `supabase/functions/create-checkout-session/index.ts`

### 2. Notification de message reçu

**Déclencheur** : Lorsqu'un client envoie un message à un notaire

**Processus** :
1. Le client envoie un message via le composant `Chat`
2. Le message est sauvegardé dans la base de données
3. Les informations du notaire sont récupérées
4. Un email de type `message_received` est envoyé au notaire
5. L'email contient un aperçu du message et un lien vers la conversation

**Code** : `client-dashboard/src/components/Chat.jsx`

### 3. Rappel la veille

**Déclencheur** : Exécution du cron job `send-appointment-reminders` (toutes les heures)

**Processus** :
1. Le cron job s'exécute
2. Les rendez-vous avec `appointment_date = demain` sont récupérés
3. Seuls les rendez-vous avec statut `confirmed` ou `accepted` sont considérés
4. Un email de type `appointment_reminder_day_before` est envoyé au notaire assigné
5. L'email contient les détails du rendez-vous (date, heure, client, adresse)

**Code** : `supabase/functions/send-appointment-reminders/index.ts`

### 4. Rappel 1 heure avant

**Déclencheur** : Exécution du cron job `send-appointment-reminders` (toutes les heures)

**Processus** :
1. Le cron job s'exécute
2. Les rendez-vous avec `appointment_date = aujourd'hui` sont récupérés
3. Seuls les rendez-vous dont l'heure est dans environ 1 heure (±5 minutes) sont considérés
4. Un email de type `appointment_reminder_one_hour_before` est envoyé au notaire assigné
5. L'email contient les détails du rendez-vous (heure, client, adresse)

**Code** : `supabase/functions/send-appointment-reminders/index.ts`

## Templates d'emails

Tous les emails utilisent le même style (Papers email template) :
- Logo en haut à gauche
- Fond beige clair (#F8F7F5)
- Carte blanche avec coins arrondis
- Boutons noirs avec texte blanc
- Police Geist

**Types d'emails** :
- `new_submission_available` : Nouvelle soumission disponible
- `message_received` : Nouveau message reçu
- `appointment_reminder_day_before` : Rappel la veille
- `appointment_reminder_one_hour_before` : Rappel 1 heure avant

## Test

### Tester la notification de nouvelle soumission

1. Créez une nouvelle soumission via le formulaire
2. Vérifiez que tous les notaires actifs reçoivent un email
3. Vérifiez les logs de l'Edge Function `create-checkout-session`

### Tester la notification de message

1. Connectez-vous en tant que client
2. Envoyez un message à un notaire
3. Vérifiez que le notaire reçoit un email
4. Vérifiez les logs du composant `Chat`

### Tester les rappels

1. Créez un rendez-vous pour demain avec un notaire
2. Appelez manuellement l'Edge Function `send-appointment-reminders` :
   ```bash
   curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
3. Vérifiez que le notaire reçoit un email de rappel
4. Vérifiez les logs de l'Edge Function `send-appointment-reminders`

## Dépannage

### Les notaires ne reçoivent pas d'emails

1. Vérifiez que les notaires ont un email valide dans la table `notary`
2. Vérifiez que les notaires ont `is_active = true`
3. Vérifiez les logs de l'Edge Function `send-transactional-email`
4. Vérifiez que `SENDGRID_API_KEY` est configurée
5. Vérifiez que l'email expéditeur est vérifié dans SendGrid

### Les rappels ne sont pas envoyés

1. Vérifiez que le cron job est configuré et actif
2. Vérifiez que le cron job appelle la bonne URL
3. Vérifiez que le cron job utilise les bons en-têtes (Authorization)
4. Vérifiez les logs de l'Edge Function `send-appointment-reminders`
5. Vérifiez que les rendez-vous ont le statut `confirmed` ou `accepted`
6. Vérifiez que les rendez-vous ont un `assigned_notary_id`

### Erreurs dans les logs

- **"Failed to send email"** : Vérifiez la configuration SendGrid
- **"No active notaries found"** : Vérifiez que des notaires ont `is_active = true`
- **"Appointment not found"** : Vérifiez que les rendez-vous existent et ont les bons statuts

## Notes

- Les emails sont envoyés de manière asynchrone (ne bloquent pas les opérations)
- Les erreurs d'envoi d'email sont loggées mais n'interrompent pas le processus
- Les rappels sont envoyés avec une tolérance de ±5 minutes pour le rappel 1 heure avant
- Les rappels ne sont envoyés qu'aux notaires assignés aux rendez-vous
- Les rappels ne sont envoyés que pour les rendez-vous avec statut `confirmed` ou `accepted`


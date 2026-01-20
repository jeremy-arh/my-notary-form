# Configuration de la Séquence SMS pour Panier Abandonné

## 📋 Vue d'ensemble

Ce système envoie automatiquement des SMS de relance aux clients qui ont une submission avec `status = 'pending_payment'`, similaire à la séquence d'emails.

## 📱 Séquence SMS

- **SMS #1 — J+1 (18h-20h)** : "Hi {{PRENOM}}, it's Jeremy from My Notary. I saw you didn't finish your certification. If you need any help, reach out at support@mynotary.io or continue here: app.mynotary.io/form"
- **SMS #2 — J+3** : "{{PRENOM}}, just checking in. Your certification only takes a couple minutes to complete. If you're stuck, let me know at support@mynotary.io. Continue here: app.mynotary.io/form"
- **SMS #3 — J+10** : "Hi {{PRENOM}}, still need your document certified? No rush. If you have any questions, I'm here to help at support@mynotary.io. Jeremy from My Notary"

## 🚀 Configuration

### Étape 1 : Exécuter les migrations SQL

Exécutez les migrations suivantes dans le Supabase SQL Editor :

1. `supabase/migrations/20250120_create_sms_sent_table.sql`
2. `supabase/migrations/20250120_create_sms_events_table.sql`
3. `supabase/migrations/20250120_setup_abandoned_cart_sms_cron.sql` (après avoir remplacé `YOUR_PROJECT_REF` et `YOUR_SERVICE_ROLE_KEY`)

### Étape 2 : Configurer les secrets Twilio

Ajoutez les secrets suivants dans Supabase Dashboard > Edge Functions > Secrets :

```bash
supabase secrets set TWILIO_ACCOUNT_SID=votre_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=votre_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=votre_numero_twilio
```

### Étape 3 : Déployer les Edge Functions

```bash
supabase functions deploy send-sms
supabase functions deploy send-abandoned-cart-sms
```

### Étape 4 : Configurer le cron job

1. Ouvrez `supabase/migrations/20250120_setup_abandoned_cart_sms_cron.sql`
2. Remplacez `YOUR_PROJECT_REF` par votre référence de projet Supabase
3. Remplacez `YOUR_SERVICE_ROLE_KEY` par votre clé de service role
4. Exécutez la migration

## 📊 Structure des Tables

### `sms_sent`
Stocke tous les SMS envoyés avec :
- `phone_number`, `recipient_name`, `recipient_type`
- `sms_type` (abandoned_cart_j+1, abandoned_cart_j+3, abandoned_cart_j+10, etc.)
- `message` (contenu du SMS)
- `submission_id`, `client_id`
- `twilio_message_sid` (pour le tracking)
- `sent_at`, `delivered_at`, `failed_at`, `failed_reason`

### `sms_events`
Stocke tous les événements Twilio (webhooks) avec :
- `phone_number`, `submission_id`, `sms_type`
- `event_type` (sent, delivered, failed, undelivered, etc.)
- `twilio_message_sid`, `twilio_status`
- `error_code`, `error_message`

## 🔍 Vérification dans le BO

Les SMS sont affichés dans :
- **SubmissionDetail** > Onglet "SMS"
- **ClientDetail** > Onglet "SMS"

Les SMS affichent :
- Statut (Livré, Envoyé, Échoué)
- Type (Séquence de relance, Notification, etc.)
- Message complet
- Numéro de téléphone
- Dates d'envoi, livraison, échec
- Twilio Message SID

## 🧪 Tester

### Via Postman

```bash
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-abandoned-cart-sms

Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  apikey: YOUR_SERVICE_ROLE_KEY

Body: {}
```

### Vérifier les SMS envoyés

```sql
SELECT 
  id,
  phone_number,
  sms_type,
  message,
  sent_at,
  delivered_at,
  failed_at,
  submission_id
FROM sms_sent
WHERE sms_type LIKE 'abandoned_cart_%'
ORDER BY sent_at DESC
LIMIT 10;
```

## ⚙️ Critères d'envoi

- Submission avec `status = 'pending_payment'`
- Submission avec un `phone_number` valide
- Timing respecté (J+1, J+3, J+10)
- SMS #1 (J+1) envoyé uniquement entre 18h et 20h
- SMS non déjà envoyé pour cette submission et ce type

## 🔄 Arrêt automatique

La séquence s'arrête automatiquement si :
- Le `status` de la submission change (n'est plus `pending_payment`)
- La submission n'a plus de `phone_number`

## 📝 Notes importantes

- Les SMS sont envoyés via Twilio
- Les SMS sont trackés dans `sms_sent` et `sms_events`
- Le cron job s'exécute toutes les heures
- Les SMS sont visibles dans le BO sur les pages SubmissionDetail et ClientDetail

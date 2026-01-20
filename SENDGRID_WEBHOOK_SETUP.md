# Configuration des Webhooks SendGrid pour le Tracking des Emails

Ce guide explique comment configurer les webhooks SendGrid pour suivre les événements d'email (ouvertures, clics, rebonds, etc.).

## 📋 Vue d'ensemble

Les webhooks SendGrid permettent de recevoir des événements en temps réel pour chaque email envoyé :
- ✅ **Processed** : Email envoyé à SendGrid
- ✅ **Delivered** : Email livré au serveur de messagerie du destinataire
- ✅ **Open** : Email ouvert par le destinataire
- ✅ **Click** : Lien cliqué dans l'email
- ❌ **Bounce** : Email rebondi (adresse invalide)
- ❌ **Dropped** : Email supprimé avant envoi
- ❌ **Spam Report** : Email signalé comme spam
- 🔕 **Unsubscribe** : Désabonnement

## 🚀 Configuration

### Étape 1 : Déployer l'Edge Function

```bash
cd supabase
supabase functions deploy sendgrid-webhook
```

### Étape 2 : Exécuter la migration SQL

Exécutez le fichier `supabase/migrations/20250120_create_email_events_table.sql` dans le Supabase SQL Editor.

Cette migration crée :
- La table `email_events` pour stocker tous les événements SendGrid
- Les colonnes `opened_at`, `clicked_at`, `clicked_url` dans `email_sequence_tracking`

### Étape 3 : Configurer le Webhook dans SendGrid

1. **Connectez-vous à SendGrid** : https://app.sendgrid.com

2. **Allez dans Settings > Mail Settings > Event Webhook** :
   - Ou directement : https://app.sendgrid.com/settings/mail_settings

3. **Cliquez sur "Add Event Webhook"** ou modifiez l'existant

4. **Configurez le webhook** :
   - **HTTP POST URL** : `https://YOUR_PROJECT_REF.supabase.co/functions/v1/sendgrid-webhook`
     - Remplacez `YOUR_PROJECT_REF` par votre référence de projet Supabase
   - **HTTP POST URL** : Cochez cette option
   - **Events** : Sélectionnez les événements à suivre :
     - ✅ **Processed** : Email envoyé
     - ✅ **Delivered** : Email livré
     - ✅ **Open** : Email ouvert
     - ✅ **Click** : Lien cliqué
     - ✅ **Bounce** : Email rebondi
     - ✅ **Dropped** : Email supprimé
     - ✅ **Spam Report** : Signalé comme spam
     - ✅ **Unsubscribe** : Désabonnement
     - ✅ **Group Unsubscribe** : Désabonnement de groupe
     - ✅ **Group Resubscribe** : Réabonnement

5. **Cliquez sur "Save"**

### Étape 4 : Tester le Webhook

1. **Envoyez un email de test** via votre application

2. **Ouvrez l'email** et cliquez sur un lien

3. **Vérifiez les événements** dans Supabase :

```sql
-- Voir tous les événements récents
SELECT 
  email,
  event_type,
  timestamp,
  submission_id,
  email_type,
  url,
  ip
FROM email_events
ORDER BY timestamp DESC
LIMIT 20;

-- Voir les ouvertures pour une submission spécifique
SELECT 
  email,
  event_type,
  timestamp,
  opened_at,
  clicked_at,
  clicked_url
FROM email_sequence_tracking
WHERE submission_id = 'YOUR_SUBMISSION_ID'
ORDER BY sent_at DESC;
```

## 📊 Utilisation des Données

### Voir les statistiques d'email pour une submission

```sql
SELECT 
  est.email,
  est.sequence_step,
  est.email_subject,
  est.sent_at,
  est.opened_at,
  est.clicked_at,
  est.clicked_url,
  CASE 
    WHEN est.opened_at IS NOT NULL THEN 'Opened'
    WHEN est.sent_at IS NOT NULL THEN 'Sent'
    ELSE 'Pending'
  END as status
FROM email_sequence_tracking est
WHERE est.submission_id = 'YOUR_SUBMISSION_ID'
ORDER BY est.sent_at DESC;
```

### Voir tous les événements pour un email spécifique

```sql
SELECT 
  event_type,
  timestamp,
  url,
  ip,
  useragent
FROM email_events
WHERE email = 'user@example.com'
ORDER BY timestamp DESC;
```

### Statistiques d'engagement pour les emails de relance

```sql
SELECT 
  sequence_step,
  COUNT(*) as total_sent,
  COUNT(opened_at) as total_opened,
  COUNT(clicked_at) as total_clicked,
  ROUND(COUNT(opened_at)::numeric / COUNT(*)::numeric * 100, 2) as open_rate,
  ROUND(COUNT(clicked_at)::numeric / COUNT(*)::numeric * 100, 2) as click_rate
FROM email_sequence_tracking
WHERE email_type LIKE 'abandoned_cart_%'
GROUP BY sequence_step
ORDER BY 
  CASE sequence_step
    WHEN 'h+1' THEN 1
    WHEN 'j+1' THEN 2
    WHEN 'j+3' THEN 3
    WHEN 'j+7' THEN 4
    WHEN 'j+10' THEN 5
    WHEN 'j+15' THEN 6
    WHEN 'j+30' THEN 7
  END;
```

## 🔍 Structure de la Table `email_events`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `email` | TEXT | Adresse email du destinataire |
| `submission_id` | UUID | ID de la submission (si applicable) |
| `email_type` | TEXT | Type d'email (abandoned_cart_h+1, payment_success, etc.) |
| `event_type` | TEXT | Type d'événement (open, click, bounce, etc.) |
| `timestamp` | TIMESTAMPTZ | Date/heure de l'événement |
| `sg_event_id` | TEXT | ID unique de l'événement SendGrid |
| `sg_message_id` | TEXT | ID du message SendGrid |
| `url` | TEXT | URL cliquée (pour les événements click) |
| `ip` | TEXT | Adresse IP (pour les événements open/click) |
| `useragent` | TEXT | User agent du navigateur |
| `reason` | TEXT | Raison (pour les bounces/drops) |
| `raw_event` | JSONB | Données complètes de l'événement |

## 📝 Notes importantes

- Les événements sont reçus en temps réel via webhook
- Chaque événement est stocké avec un `sg_event_id` unique pour éviter les doublons
- Les ouvertures et clics sont automatiquement mis à jour dans `email_sequence_tracking`
- Les `custom_args` (submission_id, email_type) sont ajoutés automatiquement lors de l'envoi d'email
- Le tracking des clics et ouvertures est activé automatiquement dans tous les emails

## 🔧 Dépannage

### Le webhook ne reçoit pas d'événements

1. Vérifiez que l'URL du webhook est correcte dans SendGrid
2. Vérifiez les logs de l'Edge Function dans Supabase Dashboard
3. Testez le webhook manuellement avec un événement de test depuis SendGrid

### Les événements sont dupliqués

- La table utilise `sg_event_id` UNIQUE pour éviter les doublons
- Si vous voyez des doublons, vérifiez que la contrainte UNIQUE est bien en place

### Les ouvertures/clics ne sont pas mis à jour dans email_sequence_tracking

- Vérifiez que `submission_id` et `email_type` sont bien passés dans `custom_args`
- Vérifiez que `email_type` commence par `abandoned_cart_` pour les emails de relance

# Guide de démarrage rapide - SendGrid pour les notifications

Ce guide vous permet de configurer rapidement SendGrid pour envoyer des emails de notification.

## 🚀 Configuration en 5 étapes

### Étape 1 : Créer le template SendGrid (10 minutes)

1. Allez sur https://app.sendgrid.com
2. **Email API** > **Dynamic Templates** > **Create a Dynamic Template**
3. Nommez-le : `MY NOTARY - Notification Email`
4. Cliquez sur **Add Version** > **Code Editor**
5. Copiez le template HTML depuis `SENDGRID_TEMPLATE_GUIDE.md`
6. Cliquez sur **Save** puis **Activate**
7. **Copiez le Template ID** (format: `d-xxxxx`)

### Étape 2 : Déployer l'Edge Function (5 minutes)

```bash
# Depuis la racine du projet
supabase functions deploy send-notification-email
```

### Étape 3 : Configurer les secrets Supabase (5 minutes)

Allez dans **Supabase Dashboard** > **Project Settings** > **Vault** et ajoutez :

```
SENDGRID_API_KEY = SG.votre_cle_api_sendgrid
SENDGRID_TEMPLATE_ID = d-votre_template_id
SENDGRID_FROM_EMAIL = support@mynotary.io
SENDGRID_FROM_NAME = MY NOTARY
CLIENT_DASHBOARD_URL = https://client.mynotary.io
NOTARY_DASHBOARD_URL = https://notary.mynotary.io
ADMIN_DASHBOARD_URL = https://admin.mynotary.io
```

### Étape 4 : Exécuter la migration SQL (2 minutes)

Exécutez `supabase-notification-email-integration.sql` dans Supabase SQL Editor pour :
- Ajouter les colonnes `email_sent` et `email_sent_at`
- Mettre à jour la fonction `create_notification`

### Étape 5 : Tester (2 minutes)

```bash
# Tester l'Edge Function
supabase functions invoke send-notification-email \
  --data '{"notification_id": "votre-notification-id"}'
```

## ✅ Résultat

- ✅ Les clients reçoivent des emails pour les notifications importantes
- ✅ Les notaires reçoivent des emails pour les notifications importantes
- ✅ Les emails utilisent votre template SendGrid personnalisé
- ✅ Les emails contiennent des liens vers les pages concernées

## 📚 Documentation complète

- **Configuration complète** : `SENDGRID_NOTIFICATION_EMAIL_SETUP.md`
- **Guide du template** : `SENDGRID_TEMPLATE_GUIDE.md`
- **Edge Function README** : `supabase/functions/send-notification-email/README.md`

## 🔧 Dépannage

### Les emails ne sont pas envoyés

1. Vérifiez que `SENDGRID_API_KEY` est correct
2. Vérifiez que `SENDGRID_TEMPLATE_ID` est correct
3. Vérifiez les logs : `supabase functions logs send-notification-email`

### Le template ne s'affiche pas

1. Vérifiez que le template est activé dans SendGrid
2. Vérifiez que le Template ID est correct
3. Testez le template dans SendGrid avec des données de test

### L'Edge Function ne fonctionne pas

1. Vérifiez que la fonction est déployée
2. Vérifiez que les secrets sont configurés
3. Vérifiez les logs de l'Edge Function


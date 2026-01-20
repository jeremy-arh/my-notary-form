# Configuration du Token pour SendGrid Webhook

## 🔍 Problème

Les webhooks SendGrid reçoivent des erreurs **401 Unauthorized** car Supabase Edge Functions nécessitent par défaut une authentification, mais SendGrid n'envoie pas de token Bearer.

## ✅ Solution : Utiliser un Token Secret dans l'URL

La fonction `sendgrid-webhook` a été modifiée pour accepter un token secret dans l'URL du webhook.

### Étape 1 : Définir le Token Secret

1. **Générez un token secret** (ex: `sg_webhook_secret_2025_xyz123`)

2. **Ajoutez-le comme secret Supabase** :
   ```bash
   supabase secrets set SENDGRID_WEBHOOK_TOKEN=sg_webhook_secret_2025_xyz123
   ```
   
   Ou via le Dashboard Supabase :
   - Allez dans **Edge Functions** > **Secrets**
   - Ajoutez : `SENDGRID_WEBHOOK_TOKEN` = `sg_webhook_secret_2025_xyz123`

### Étape 2 : Configurer l'URL du Webhook dans SendGrid

1. **Allez dans SendGrid** : https://app.sendgrid.com/settings/mail_settings

2. **Modifiez le webhook existant** ou créez-en un nouveau

3. **Configurez l'URL avec le token** :
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/sendgrid-webhook?token=sg_webhook_secret_2025_xyz123
   ```
   
   Remplacez :
   - `YOUR_PROJECT_REF` par votre référence de projet Supabase
   - `sg_webhook_secret_2025_xyz123` par le même token que vous avez défini dans Supabase

4. **Sauvegardez**

### Étape 3 : Redéployer la Fonction

```bash
supabase functions deploy sendgrid-webhook
```

### Étape 4 : Tester

1. **Envoyez un email de test** via votre application
2. **Ouvrez l'email** ou cliquez sur un lien
3. **Vérifiez les logs** dans Supabase Dashboard > Edge Functions > sendgrid-webhook > Logs
4. **Les erreurs 401 devraient disparaître**

## 🔒 Option Alternative : Sans Token (Moins Sécurisé)

Si vous ne voulez pas utiliser de token, vous pouvez laisser `SENDGRID_WEBHOOK_TOKEN` vide dans les secrets Supabase. La fonction acceptera alors toutes les requêtes sans vérification.

**⚠️ Attention** : Cela rend votre webhook accessible à n'importe qui connaissant l'URL. Utilisez un token pour la sécurité.

## 📝 Vérification

Après configuration, vérifiez que les événements sont bien enregistrés :

```sql
SELECT 
  email,
  event_type,
  timestamp,
  submission_id,
  email_type
FROM email_events
ORDER BY timestamp DESC
LIMIT 10;
```

## 🐛 Dépannage

### Erreur 401 persiste
- Vérifiez que le token dans l'URL SendGrid correspond exactement au token dans Supabase Secrets
- Vérifiez que la fonction a été redéployée après l'ajout du secret
- Vérifiez les logs de la fonction pour voir le message d'erreur exact

### Erreur "Missing environment variables"
- Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont définis dans les secrets Supabase
- Ces secrets sont généralement définis automatiquement, mais vérifiez dans Edge Functions > Secrets

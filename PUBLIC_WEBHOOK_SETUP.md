# Configuration Webhook Public (Sans Authentification)

## ✅ Fonction Modifiée

La fonction `sendgrid-webhook` accepte maintenant les requêtes **SANS authentification Supabase**.

## 🔒 Sécurité Optionnelle

Pour ajouter une couche de sécurité, vous pouvez configurer un token secret :

### Option 1 : Sans Token (Fonction Publique)

La fonction fonctionne sans configuration supplémentaire. Les webhooks SendGrid seront acceptés directement.

**URL du webhook dans SendGrid** :
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/sendgrid-webhook
```

### Option 2 : Avec Token Secret (Recommandé pour Production)

1. **Générez un token secret** (ex: `sg_webhook_secret_2025_xyz123`)

2. **Ajoutez-le comme secret Supabase** :
   ```bash
   supabase secrets set SENDGRID_WEBHOOK_TOKEN=sg_webhook_secret_2025_xyz123
   ```

3. **Configurez l'URL du webhook dans SendGrid avec le token** :
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/sendgrid-webhook?token=sg_webhook_secret_2025_xyz123
   ```

4. **Redéployez la fonction** :
   ```bash
   supabase functions deploy sendgrid-webhook
   ```

## 📝 Configuration SendGrid

1. **Allez dans SendGrid** : https://app.sendgrid.com/settings/mail_settings

2. **Configurez le webhook** :
   - **HTTP POST URL** : `https://YOUR_PROJECT_REF.supabase.co/functions/v1/sendgrid-webhook`
     - Ajoutez `?token=VOTRE_TOKEN` si vous utilisez l'option 2
   - **Events** : Sélectionnez tous les événements à suivre

3. **Sauvegardez**

## ✅ Vérification

1. **Redéployez la fonction** :
   ```bash
   supabase functions deploy sendgrid-webhook
   ```

2. **Envoyez un email de test** via votre application

3. **Vérifiez les logs** dans Supabase Dashboard > Edge Functions > sendgrid-webhook > Logs
   - Vous devriez voir `📧 [SendGrid Webhook] Request received`
   - Les erreurs 401 devraient disparaître

4. **Vérifiez les événements dans la base de données** :
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
- Vérifiez que la fonction a été redéployée
- Vérifiez les logs pour voir le message exact
- Assurez-vous que l'URL dans SendGrid est correcte

### Aucun événement enregistré
- Vérifiez que les événements sont bien sélectionnés dans SendGrid
- Vérifiez les logs de la fonction pour voir les erreurs
- Vérifiez que les tables `email_events` et `email_sent` existent

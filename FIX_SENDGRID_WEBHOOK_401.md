# Fix : Erreurs 401 sur sendgrid-webhook

## 🔍 Problème

Les webhooks SendGrid reçoivent des erreurs **401 Unauthorized** car Supabase Edge Functions nécessitent par défaut une authentification Bearer token, mais SendGrid n'envoie pas de token d'authentification.

## ✅ Solution

Il y a deux approches possibles :

### Option 1 : Vérification de signature SendGrid (Recommandé - Plus sécurisé)

SendGrid peut signer les webhooks avec une clé secrète. Vous pouvez vérifier cette signature dans la fonction.

1. **Configurer la signature dans SendGrid** :
   - Allez dans SendGrid > Settings > Mail Settings > Event Webhook
   - Activez "Signed Event Webhook"
   - Copiez la clé secrète générée

2. **Ajouter la clé secrète comme secret Supabase** :
   ```bash
   supabase secrets set SENDGRID_WEBHOOK_SECRET=votre_cle_secrete
   ```

3. **Modifier la fonction pour vérifier la signature** (voir code ci-dessous)

### Option 2 : Autoriser les webhooks sans authentification Supabase (Plus simple)

Les Edge Functions Supabase peuvent être configurées pour accepter les requêtes sans authentification si elles sont appelées depuis des webhooks externes.

**La fonction a déjà été modifiée pour accepter les requêtes sans authentification Supabase.**

## 🔧 Vérification

1. **Redéployer la fonction** :
   ```bash
   supabase functions deploy sendgrid-webhook
   ```

2. **Tester le webhook** :
   - Envoyez un email via votre application
   - Ouvrez l'email ou cliquez sur un lien
   - Vérifiez les logs dans Supabase Dashboard > Edge Functions > sendgrid-webhook > Logs
   - Les erreurs 401 devraient disparaître

3. **Vérifier les événements dans la base de données** :
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

## 🔒 Sécurité (Optionnel mais recommandé)

Pour améliorer la sécurité, vous pouvez ajouter une vérification de signature SendGrid dans la fonction. Voici comment :

1. **Activer la signature dans SendGrid** et obtenir la clé secrète
2. **Ajouter le secret** :
   ```bash
   supabase secrets set SENDGRID_WEBHOOK_SECRET=votre_cle_secrete
   ```
3. **Modifier la fonction** pour vérifier la signature avant de traiter les événements

## 📝 Notes

- Les webhooks SendGrid sont des requêtes POST depuis les serveurs SendGrid
- Ils n'incluent pas de headers d'authentification Supabase
- La fonction doit donc accepter ces requêtes sans authentification Bearer token
- Pour la sécurité, utilisez la vérification de signature SendGrid si possible

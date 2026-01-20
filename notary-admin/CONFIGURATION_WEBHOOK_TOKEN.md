# Configuration du Webhook Token pour Google Ads Scripts

## 🔴 Problème : Erreur 401 Unauthorized

Si vous obtenez une erreur `401 Unauthorized`, c'est que le token n'est pas correctement configuré.

## ✅ Solution : Configurer le token dans Supabase

### Étape 1 : Définir le token dans Supabase

1. Allez dans votre projet Supabase : https://app.supabase.com/
2. Allez dans **"Project Settings"** > **"Edge Functions"** > **"Secrets"**
3. Cliquez sur **"Add new secret"**
4. Ajoutez :
   - **Name** : `GOOGLE_ADS_WEBHOOK_TOKEN`
   - **Value** : Un token secret de votre choix (ex: `mon-super-token-secret-2024`)

### Étape 2 : Utiliser le même token dans votre script Google Ads

Dans votre script Google Ads (`google-ads-script.js`), remplacez :

```javascript
const WEBHOOK_TOKEN = 'your-secret-token'; // ❌ Ancien
```

Par :

```javascript
const WEBHOOK_TOKEN = 'mon-super-token-secret-2024'; // ✅ Même token que dans Supabase
```

### Étape 3 : Redéployer la fonction Edge (si nécessaire)

Si vous avez modifié la fonction Edge, redéployez-la :

```bash
supabase functions deploy receive-google-ads-costs
```

## 🔍 Vérification

1. **Vérifiez que le token est identique** dans :
   - Supabase Secrets : `GOOGLE_ADS_WEBHOOK_TOKEN`
   - Script Google Ads : `WEBHOOK_TOKEN`

2. **Testez à nouveau** le script dans Google Ads Scripts

3. **Vérifiez les logs** dans Supabase :
   - Edge Functions > Logs
   - Vous devriez voir les logs de débogage avec les tokens

## 💡 Exemple de configuration

### Dans Supabase Secrets :
```
GOOGLE_ADS_WEBHOOK_TOKEN = abc123xyz789secret
```

### Dans votre script Google Ads :
```javascript
const WEBHOOK_TOKEN = 'abc123xyz789secret'; // ✅ Identique
```

## ⚠️ Important

- Le token doit être **exactement identique** dans les deux endroits
- Utilisez un token fort et sécurisé (au moins 32 caractères)
- Ne partagez jamais ce token publiquement

## 🐛 Si ça ne fonctionne toujours pas

1. Vérifiez que la fonction Edge est bien déployée
2. Vérifiez les logs Supabase pour voir les erreurs détaillées
3. Assurez-vous que l'URL de la fonction est correcte dans le script
4. Vérifiez que le format de date dans le script correspond au format attendu par la base de données




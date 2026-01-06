# Guide complet : Obtenir les tokens Google Ads API

Ce guide vous explique étape par étape comment obtenir tous les tokens nécessaires pour intégrer l'API Google Ads.

## 📋 Prérequis

- Un compte Google Ads actif avec des campagnes en cours
- Un compte Google (Gmail)
- Accès administrateur au compte Google Ads

---

## 🔑 1. Developer Token (Token de développeur)

### Étape 1 : Accéder au centre API Google Ads

1. Allez sur : https://ads.google.com/aw/apicenter
2. Connectez-vous avec votre compte Google Ads

### Étape 2 : Créer une application

1. Cliquez sur **"Créer une application"** ou **"Create Application"**
2. Remplissez le formulaire :
   - **Nom de l'application** : Ex: "Notary Admin - Cash Flow Sync"
   - **Type d'application** : Sélectionnez "Application Web" ou "Other"
   - **Description** : Décrivez votre utilisation (ex: "Synchronisation automatique des coûts publicitaires")
   - **Site Web** : URL de votre site (peut être temporaire)
   - **Contact email** : Votre email

### Étape 3 : Obtenir le Developer Token

1. Une fois l'application créée, vous verrez votre **Developer Token**
2. **⚠️ IMPORTANT** : Ce token peut prendre jusqu'à **24-48 heures** pour être approuvé par Google
3. Pendant l'attente, vous pouvez utiliser le token en mode **"Test"** (limité)

**Où trouver le Developer Token :**
- Dans le tableau de bord de votre application
- Format : `xxxxxxxxxxxxxxxxxxxx` (chaîne alphanumérique)

---

## 🔐 2. Client ID et Client Secret (OAuth 2.0)

### Étape 1 : Créer un projet Google Cloud

1. Allez sur : https://console.cloud.google.com/
2. Cliquez sur le sélecteur de projet en haut
3. Cliquez sur **"Nouveau projet"** ou **"New Project"**
4. Nommez votre projet (ex: "Notary Admin Google Ads")
5. Cliquez sur **"Créer"**

### Étape 2 : Activer l'API Google Ads

1. Dans votre projet Google Cloud, allez dans **"APIs & Services"** > **"Library"**
2. Recherchez **"Google Ads API"**
3. Cliquez sur **"Enable"** ou **"Activer"**

### Étape 3 : Configurer l'écran de consentement OAuth

1. Allez dans **"APIs & Services"** > **"OAuth consent screen"**
2. Sélectionnez **"External"** (ou "Interne" si vous avez un compte Google Workspace)
3. Remplissez les informations :
   - **App name** : Nom de votre application
   - **User support email** : Votre email
   - **Developer contact information** : Votre email
4. Cliquez sur **"Save and Continue"**
5. Dans **"Scopes"**, cliquez sur **"Add or Remove Scopes"**
6. Ajoutez ces scopes :
   - `https://www.googleapis.com/auth/adwords`
7. Cliquez sur **"Save and Continue"**
8. Ajoutez votre email comme **Test User** (si en mode test)
9. Cliquez sur **"Save and Continue"**

### Étape 4 : Créer les identifiants OAuth 2.0

1. Allez dans **"APIs & Services"** > **"Credentials"**
2. Cliquez sur **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. Sélectionnez **"Web application"**
4. Remplissez :
   - **Name** : Ex: "Google Ads API Client"
   - **Authorized redirect URIs** : 
     - Pour développement local : `http://localhost:3000`
     - Pour production : L'URL de votre application
5. Cliquez sur **"Create"**
6. **⚠️ IMPORTANT** : Copiez immédiatement le **Client ID** et le **Client Secret** (vous ne pourrez plus voir le secret après)

**Où trouver les identifiants :**
- **Client ID** : Format `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret** : Format `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🏢 3. Customer ID (ID du compte client)

### Méthode 1 : Via l'interface Google Ads

1. Connectez-vous à : https://ads.google.com/
2. En haut à droite, vous verrez votre **Customer ID**
3. Format : `123-456-7890` (avec tirets) ou `1234567890` (sans tirets)
4. **Utilisez le format SANS tirets** dans votre code : `1234567890`

### Méthode 2 : Via l'URL

1. Quand vous êtes connecté à Google Ads, regardez l'URL
2. Vous verrez quelque chose comme : `https://ads.google.com/aw/campaigns?ocid=1234567890`
3. Le numéro après `ocid=` est votre Customer ID

---

## 🔄 4. Refresh Token (Token d'actualisation)

### Étape 1 : Obtenir le code d'autorisation

Créez un fichier HTML temporaire pour obtenir le refresh token :

```html
<!DOCTYPE html>
<html>
<head>
    <title>Google Ads OAuth</title>
</head>
<body>
    <h1>Google Ads OAuth Flow</h1>
    <a href="https://accounts.google.com/o/oauth2/v2/auth?client_id=VOTRE_CLIENT_ID&redirect_uri=http://localhost:3000&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent" target="_blank">
        Cliquer ici pour autoriser
    </a>
    <p>Après avoir cliqué, vous serez redirigé vers localhost:3000 avec un code dans l'URL</p>
    <p>Copiez le code de l'URL (paramètre "code")</p>
</body>
</html>
```

**Remplacez `VOTRE_CLIENT_ID`** par votre Client ID obtenu à l'étape 2.

### Étape 2 : Échanger le code contre un Refresh Token

Utilisez cette commande curl (remplacez les valeurs) :

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=VOTRE_CLIENT_ID" \
  -d "client_secret=VOTRE_CLIENT_SECRET" \
  -d "code=LE_CODE_OBTENU_ETAPE_1" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:3000"
```

**Réponse attendue :**
```json
{
  "access_token": "ya29.xxxxx",
  "expires_in": 3599,
  "refresh_token": "1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "scope": "https://www.googleapis.com/auth/adwords",
  "token_type": "Bearer"
}
```

**⚠️ IMPORTANT** : Copiez le **refresh_token** - c'est ce dont vous avez besoin !

### Alternative : Utiliser un script Node.js

Créez un fichier `get-refresh-token.js` :

```javascript
const readline = require('readline');
const { google } = require('googleapis');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const oauth2Client = new google.auth.OAuth2(
  'VOTRE_CLIENT_ID',
  'VOTRE_CLIENT_SECRET',
  'http://localhost:3000'
);

const scopes = ['https://www.googleapis.com/auth/adwords'];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('Visitez cette URL pour autoriser l\'application:');
console.log(url);

rl.question('Entrez le code de l\'URL de redirection: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Erreur:', err);
    console.log('Refresh Token:', token.refresh_token);
    rl.close();
  });
});
```

Exécutez : `node get-refresh-token.js`

---

## 📝 Résumé des tokens à configurer

Une fois tous les tokens obtenus, configurez-les dans Supabase :

### Variables d'environnement Supabase

1. Allez dans votre projet Supabase : https://app.supabase.com/
2. Allez dans **"Project Settings"** > **"Edge Functions"** > **"Secrets"**
3. Ajoutez ces secrets :

```
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## ✅ Vérification

Pour vérifier que tout fonctionne, vous pouvez tester avec cette requête :

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=VOTRE_CLIENT_ID" \
  -d "client_secret=VOTRE_CLIENT_SECRET" \
  -d "refresh_token=VOTRE_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"
```

Si vous obtenez un `access_token` en réponse, c'est que tout est correctement configuré !

---

## 🚀 Script automatisé pour obtenir le Refresh Token

Pour faciliter l'obtention du Refresh Token, utilisez le script fourni :

1. **Installez la dépendance** (si pas déjà installée) :
   ```bash
   npm install googleapis
   ```

2. **Modifiez le script** `scripts/get-google-ads-refresh-token.mjs` :
   - Remplacez `VOTRE_CLIENT_ID` par votre Client ID
   - Remplacez `VOTRE_CLIENT_SECRET` par votre Client Secret

3. **Exécutez le script** :
   ```bash
   node scripts/get-google-ads-refresh-token.mjs
   ```

4. Le script va :
   - Ouvrir une URL dans votre navigateur
   - Créer un serveur temporaire sur `localhost:3000`
   - Vous rediriger vers Google pour autoriser l'application
   - Afficher votre Refresh Token dans la console

**⚠️ Assurez-vous que le port 3000 est libre avant d'exécuter le script.**

---

## 🔗 Liens utiles

- **Centre API Google Ads** : https://ads.google.com/aw/apicenter
- **Google Cloud Console** : https://console.cloud.google.com/
- **Documentation Google Ads API** : https://developers.google.com/google-ads/api/docs/start
- **OAuth 2.0 Playground** (pour tester) : https://developers.google.com/oauthplayground/

---

## ⚠️ Notes importantes

1. **Developer Token** : Peut prendre 24-48h pour être approuvé
2. **Refresh Token** : Ne s'affiche qu'une seule fois lors de la première autorisation avec `prompt=consent`
3. **Customer ID** : Utilisez le format SANS tirets dans le code
4. **Sécurité** : Ne partagez JAMAIS ces tokens publiquement
5. **Quotas** : L'API Google Ads a des limites de requêtes par jour

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
- Vérifiez que tous les scopes sont correctement configurés
- Assurez-vous que l'API Google Ads est activée dans Google Cloud Console
- Vérifiez que votre Developer Token est approuvé (pas en mode test)


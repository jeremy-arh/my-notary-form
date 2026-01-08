# 🚀 Guide Rapide : Obtenir les tokens Google Ads

## 📍 Où obtenir chaque token ?

### 1️⃣ **Developer Token**
📍 **Où** : https://ads.google.com/aw/apicenter
- Créez une application
- Le token apparaît dans le tableau de bord
- ⏱️ **Délai** : 24-48h pour approbation

### 2️⃣ **Client ID & Client Secret**
📍 **Où** : https://console.cloud.google.com/
- Créez un projet
- Activez "Google Ads API"
- Configurez OAuth consent screen
- Créez "OAuth client ID" (type: Web application)
- ⚠️ **Copiez immédiatement** le Client Secret (il ne s'affiche qu'une fois)

### 3️⃣ **Customer ID**
📍 **Où** : https://ads.google.com/
- Visible en haut à droite de l'interface
- Format : `1234567890` (sans tirets)
- Ou dans l'URL : `ocid=1234567890`

### 4️⃣ **Refresh Token**
📍 **Où** : Via script automatisé (recommandé)
- Utilisez le script : `scripts/get-google-ads-refresh-token.mjs`
- Ou suivez le guide manuel dans `GOOGLE_ADS_API_SETUP_GUIDE.md`

---

## ⚡ Méthode rapide (recommandée)

1. **Installez googleapis** :
   ```bash
   npm install googleapis
   ```

2. **Modifiez** `scripts/get-google-ads-refresh-token.mjs` :
   - Remplacez `VOTRE_CLIENT_ID`
   - Remplacez `VOTRE_CLIENT_SECRET`

3. **Exécutez** :
   ```bash
   node scripts/get-google-ads-refresh-token.mjs
   ```

4. **Suivez les instructions** à l'écran

---

## 📝 Configuration dans Supabase

Une fois tous les tokens obtenus, ajoutez-les dans Supabase :

**Project Settings** > **Edge Functions** > **Secrets**

```
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxx
GOOGLE_ADS_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_ADS_REFRESH_TOKEN=1//xxxxx
```

---

## 📚 Documentation complète

Pour plus de détails, consultez : `GOOGLE_ADS_API_SETUP_GUIDE.md`



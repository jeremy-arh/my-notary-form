# Configuration du fichier .env

## 📋 Fichier .env requis

Créez un fichier `.env` dans le dossier `notary-dashboard/` avec le contenu suivant :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
VITE_GOOGLE_MAPS_API_KEY=votre_google_maps_api_key
```

## 🔑 Où trouver les clés

### Supabase
1. **Supabase Dashboard** → Votre projet
2. **Settings** → **API**
3. Copiez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### Google Maps API
1. **Google Cloud Console** → [console.cloud.google.com](https://console.cloud.google.com)
2. Créez un projet ou sélectionnez un projet existant
3. Activez les APIs suivantes :
   - **Places API** (pour l'autocomplétion d'adresses)
   - **Time Zone API** (pour la timezone précise)
4. **Credentials** → **Create Credentials** → **API Key**
5. Copiez la clé → `VITE_GOOGLE_MAPS_API_KEY`
6. (Recommandé) Restreignez la clé API aux domaines de votre application

## ⚠️ Important

- **Google Maps API Key** : Nécessaire pour l'autocomplétion d'adresses et la récupération de la timezone précise
- Les APIs Google sont facturées selon l'utilisation (voir [Google Cloud Pricing](https://cloud.google.com/maps-platform/pricing))
- Pour le développement, vous pouvez utiliser un quota gratuit limité

## ✅ Après configuration

1. Sauvegardez le fichier `.env`
2. **Redémarrez le serveur de développement** (`npm run dev`)
3. Vérifiez que l'autocomplétion d'adresse fonctionne correctement

## 🔒 Sécurité

Le fichier `.env` est déjà dans `.gitignore` et ne sera pas commité dans Git.


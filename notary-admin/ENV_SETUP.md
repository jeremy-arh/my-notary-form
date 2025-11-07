# Configuration du fichier .env

## 📋 Fichier .env requis

Créez un fichier `.env` dans le dossier `notary-admin/` avec le contenu suivant :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
VITE_GOOGLE_MAPS_API_KEY=votre_google_maps_api_key
```

## 🔑 Où trouver les clés

### Supabase
1. **Supabase Dashboard** → Votre projet
2. **Settings** → **API**
3. Copiez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `VITE_SUPABASE_SERVICE_ROLE_KEY` ⚠️ **SECRET**

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

- **Service Role Key** : Cette clé bypass complètement RLS (Row Level Security)
- **NE JAMAIS** exposer cette clé dans le code client en production
- Utilisez-la uniquement pour le dashboard admin sur un domaine séparé
- Le dashboard admin utilise automatiquement la service role key si elle est disponible

## ✅ Après configuration

1. Sauvegardez le fichier `.env`
2. **Redémarrez le serveur de développement** (`npm run dev`)
3. Vérifiez la console du navigateur pour voir quel type de clé est utilisé

## 🔒 Sécurité

Le fichier `.env` est déjà dans `.gitignore` et ne sera pas commité dans Git.


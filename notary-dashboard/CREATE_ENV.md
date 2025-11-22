# 🚀 Créer le fichier .env pour notary-dashboard

## ⚠️ Problème détecté

Le fichier `.env` est **absent** du dossier `notary-dashboard/`. C'est pour ça que les variables d'environnement sont `undefined`.

## ✅ Solution : Créer le fichier .env

### Option 1 : Copier depuis notary-admin (si vous avez les mêmes credentials)

Si vous utilisez le même projet Supabase pour tous les dashboards :

1. Ouvrez le fichier `notary-admin/.env`
2. Copiez son contenu
3. Créez un nouveau fichier `notary-dashboard/.env`
4. Collez le contenu (sans la ligne `VITE_SUPABASE_SERVICE_ROLE_KEY` qui n'est pas nécessaire pour le dashboard notary)

### Option 2 : Créer manuellement

1. **Créez un fichier nommé exactement `.env`** dans le dossier `notary-dashboard/`

2. **Ajoutez ces lignes** (remplacez par vos vraies valeurs) :

```env
VITE_SUPABASE_URL=https://votre-projet-id.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key_ici
```

3. **Où trouver ces valeurs** :
   - Allez sur [Supabase Dashboard](https://app.supabase.com)
   - Sélectionnez votre projet
   - Allez dans **Settings** → **API**
   - Copiez :
     - **Project URL** → `VITE_SUPABASE_URL`
     - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Option 3 : Utiliser le template

1. Copiez le fichier `.env.example` vers `.env` :
   ```powershell
   cd notary-dashboard
   Copy-Item .env.example .env
   ```

2. Éditez `.env` et remplacez les valeurs placeholder par vos vraies valeurs

## ⚠️ Format important

Le fichier doit respecter ce format exact :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

❌ **NE PAS** mettre d'espaces autour du `=` :
```env
VITE_SUPABASE_URL = https://...  ← MAUVAIS
```

✅ **CORRECT** :
```env
VITE_SUPABASE_URL=https://...  ← BON
```

## ✅ Après avoir créé le fichier

1. **Sauvegardez** le fichier `.env`
2. **Redémarrez** le serveur de développement :
   ```powershell
   # Arrêtez le serveur (Ctrl+C)
   npm run dev
   ```
3. **Vérifiez** la console du navigateur - vous devriez voir :
   ```
   ✅ Valid credentials: true
   ```

## 🔍 Vérification

Pour vérifier que le fichier est correct, exécutez :

```powershell
cd notary-dashboard
npm run verify-env
```

Ce script vous dira si le fichier existe et s'il est bien formaté.






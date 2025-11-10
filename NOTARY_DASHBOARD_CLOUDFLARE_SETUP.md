# 🚀 Configuration Cloudflare Pages pour Notary Dashboard

## 📋 Problème Identifié

Le dashboard notaire (`notary-dashboard`) n'est pas encore configuré pour Cloudflare Pages. Il faut :
1. Créer un projet Cloudflare Pages pour le notary-dashboard
2. Configurer les variables d'environnement
3. Configurer le Root Directory
4. Déployer

## 🏗️ Configuration Cloudflare Pages

### Étape 1 : Créer le Projet

1. Allez sur https://dash.cloudflare.com
2. **Pages** > **Create a project** > **Connect to Git**
3. Sélectionnez votre repository
4. Configurez le projet :
   - **Project name**: `notary-dashboard`
   - **Production branch**: `main` (ou votre branche principale)
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist` ⚠️ **Important : juste `dist`**
   - **Root directory (advanced)** → **Path**: `notary-dashboard` ⚠️ **C'EST LA CLÉ !**

### Étape 2 : Variables d'Environnement

1. Allez dans **Settings** > **Environment variables**
2. Ajoutez les variables suivantes pour **Production**, **Preview** et **Branch previews** :

```
VITE_SUPABASE_URL = https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY = votre_anon_key_ici
VITE_GOOGLE_MAPS_API_KEY = votre_google_maps_api_key (optionnel)
```

⚠️ **Important** : 
- Les variables doivent commencer par `VITE_`
- Les variables sont intégrées au moment du BUILD
- **VOUS DEVEZ REDÉPLOYER après avoir ajouté les variables**

### Étape 3 : Déployer

1. Après avoir ajouté les variables, **redéployez immédiatement** :
   - Allez dans **Deployments**
   - Cliquez sur **Create deployment** ou **Retry deployment**
   - Sélectionnez la branche `main`
   - Cliquez sur **Deploy**
2. Attendez que le build se termine (5-10 minutes pour le premier)
3. Votre site sera disponible sur `https://notary-dashboard.pages.dev`

### Étape 4 : Configurer le Sous-domaine

Pour utiliser `notary.mynotary.io` :

1. **Settings** > **Custom domains**
2. Cliquez sur **Set up a custom domain**
3. Entrez `notary.mynotary.io`
4. Configurez le DNS selon les instructions

#### Configuration DNS (si domaine géré par Cloudflare)

Ajoutez un enregistrement CNAME :

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | notary | `notary-dashboard.pages.dev` | ✅ Proxied |

## 📝 Résumé de Configuration

| Paramètre | Valeur |
|-----------|--------|
| **Root directory** | `notary-dashboard` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Framework preset** | `Vite` |
| **Production branch** | `main` |

## 🔍 Vérification

Après le déploiement, vérifiez :

1. Ouvrez l'application déployée
2. Ouvrez la console du navigateur (F12)
3. Vérifiez les logs :
   - `📍 URL:` devrait afficher votre URL Supabase (pas `placeholder`)
   - `✅ Valid credentials: true`
   - Pas de message "SUPABASE NOT CONFIGURED"

## 🐛 Problèmes Courants

### Variables d'environnement non disponibles

**Symptôme** : `URL: https://placeholder.supabase.co` dans la console

**Solution** :
1. Vérifiez que les variables sont définies pour **Production**
2. Redéployez après avoir ajouté les variables
3. Vérifiez les logs de build pour voir si les variables sont disponibles

### Erreur de connexion Supabase

**Symptôme** : Erreur lors de la connexion au dashboard

**Solution** :
1. Vérifiez que les variables d'environnement sont correctes
2. Vérifiez que l'URL Supabase est correcte dans Supabase Dashboard
3. Vérifiez que le domaine Cloudflare est ajouté dans Supabase > Authentication > URL Configuration

### 404 sur les routes

**Symptôme** : Refresh sur `/dashboard` ou `/login` retourne une 404

**Solution** : Vérifiez que le fichier `public/_redirects` existe et contient :
```
/*    /index.html   200
```

## ✅ Checklist

- [ ] Projet Cloudflare Pages créé pour `notary-dashboard`
- [ ] Root directory configuré à `notary-dashboard`
- [ ] Build output directory configuré à `dist`
- [ ] Variables d'environnement ajoutées (Production, Preview)
- [ ] Redéploiement effectué après avoir ajouté les variables
- [ ] Build réussi (vérifié dans les logs)
- [ ] Sous-domaine configuré (`notary.mynotary.io`)
- [ ] DNS configuré
- [ ] URLs Supabase mises à jour avec le nouveau domaine
- [ ] Application testée (console du navigateur)

## 📚 Documentation Complémentaire

- `CLOUDFLARE_DEPLOYMENT.md` - Guide complet de déploiement
- `CLOUDFLARE_ENV_VARS_FIX.md` - Résolution problèmes variables d'environnement
- `CLOUDFLARE_ENV_DEBUG.md` - Débogage avancé

---

**Note** : Le notary-dashboard nécessite les mêmes variables d'environnement que le client-dashboard, mais sera déployé sur un sous-domaine séparé (`notary.mynotary.io`).


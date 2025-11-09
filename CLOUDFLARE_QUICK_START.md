# 🚀 Déploiement Rapide sur Cloudflare Pages

Guide rapide pour déployer les trois applications sur Cloudflare Pages.

## 📋 Prérequis Rapides

- Compte Cloudflare (gratuit)
- Repository Git (GitHub/GitLab)
- Credentials Supabase

## 🏗️ Structure des Déploiements

| Application | Dossier | Sous-domaine | Root Directory | Build Command | Output Directory |
|------------|---------|--------------|----------------|---------------|------------------|
| Client Dashboard | `client-dashboard/` | `client.votredomaine.com` | `client-dashboard` | `npm run build` | `dist` |
| Admin Dashboard | `notary-admin/` | `admin.votredomaine.com` | `notary-admin` | `npm run build` | `dist` |
| Formulaire Principal | `/` (racine) | `app.votredomaine.com` | `/` (vide) | `npm run build` | `dist` |

## ⚡ Déploiement en 5 Étapes

### 1. Connecter le Repository

1. Allez sur https://dash.cloudflare.com
2. **Pages** > **Create a project** > **Connect to Git**
3. Sélectionnez votre repository
4. Répétez pour chaque application (3 projets séparés)

### 2. Configurer le Build

Pour chaque projet, configurez :

#### Client Dashboard
- **Project name**: `notary-client-dashboard`
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist` ⚠️ **Important : juste `dist`, pas `client-dashboard/dist`**
- **Root directory (advanced)** → **Path**: `client-dashboard` ⚠️ **C'EST LA CLÉ !**

#### Admin Dashboard
- **Project name**: `notary-admin-dashboard`
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist` ⚠️ **Important : juste `dist`, pas `notary-admin/dist`**
- **Root directory (advanced)** → **Path**: `notary-admin` ⚠️ **C'EST LA CLÉ !**

#### Formulaire Principal
- **Project name**: `notary-main-form`
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/`

### 3. Ajouter les Variables d'Environnement

Pour **chaque projet**, allez dans **Settings** > **Environment variables** et ajoutez :

```
VITE_SUPABASE_URL = https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY = votre_anon_key_ici
```

⚠️ **Important** : Ajoutez ces variables pour **Production**, **Preview** et **Branch previews**.

### 4. Déployer

1. Cliquez sur **Save and Deploy**
2. Attendez que le build se termine (5-10 minutes pour le premier)
3. Votre site sera disponible sur `https://votre-projet.pages.dev`

### 5. Configurer les Sous-domaines

Pour chaque projet :

1. **Settings** > **Custom domains**
2. Cliquez sur **Set up a custom domain**
3. Entrez votre sous-domaine (ex: `client.votredomaine.com`)
4. Configurez le DNS selon les instructions

#### Configuration DNS (si domaine géré par Cloudflare)

Ajoutez des enregistrements CNAME :

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | client | `notary-client-dashboard.pages.dev` | ✅ Proxied |
| CNAME | admin | `notary-admin-dashboard.pages.dev` | ✅ Proxied |
| CNAME | app | `notary-main-form.pages.dev` | ✅ Proxied |

## ✅ Checklist

- [ ] 3 projets Cloudflare Pages créés
- [ ] Build commands configurés correctement
- [ ] Variables d'environnement ajoutées (×3)
- [ ] Premier déploiement réussi
- [ ] Sous-domaines configurés
- [ ] DNS configuré
- [ ] URLs Supabase mises à jour
- [ ] Tests effectués sur chaque sous-domaine

## 🐛 Problèmes Courants

### Build échoue
→ Vérifiez que les commandes de build sont correctes et testez en local

### Variables d'environnement undefined
→ Vérifiez que les variables commencent par `VITE_` et sont définies pour tous les environnements

### 404 sur les routes
→ Vérifiez que le fichier `public/_redirects` existe avec `/*    /index.html   200`

### CORS errors
→ Ajoutez vos domaines Cloudflare dans Supabase > Authentication > URL Configuration

## 📚 Documentation Complète

Pour plus de détails, consultez `CLOUDFLARE_DEPLOYMENT.md`

---

**Temps estimé** : 15-30 minutes pour configurer les 3 projets


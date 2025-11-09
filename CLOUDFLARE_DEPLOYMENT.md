# 🚀 Déploiement sur Cloudflare Pages

Guide complet pour déployer les applications sur Cloudflare Pages avec des sous-domaines séparés.

## 📋 Prérequis

- Compte Cloudflare (gratuit) : https://www.cloudflare.com
- Compte GitHub/GitLab avec ce repository
- Variables d'environnement Supabase (URL et Anon Key)
- Domaine configuré dans Cloudflare (optionnel pour les sous-domaines)

## 🏗️ Architecture

Le projet contient **trois applications distinctes** qui seront déployées sur des sous-domaines séparés :

1. **Client Dashboard** (`client-dashboard/`)
   - Sous-domaine : `client.votredomaine.com`
   - Dashboard pour les clients

2. **Admin Dashboard** (`notary-admin/`)
   - Sous-domaine : `admin.votredomaine.com`
   - Dashboard pour les administrateurs

3. **Formulaire Principal** (`src/` à la racine)
   - Sous-domaine : `app.votredomaine.com` ou domaine principal
   - Formulaire de demande de services notariaux

## 🔧 Fichiers de Configuration

Les fichiers suivants ont été créés pour Cloudflare :

### Pour chaque dashboard :

1. **`wrangler.toml`** - Configuration Cloudflare Pages
2. **`public/_redirects`** - Gestion des routes SPA (React Router)
3. **`public/_headers`** - Headers de sécurité

## 📝 Instructions de Déploiement

### Méthode 1 : Déploiement via Git (Recommandé)

#### Étape 1 : Installer Wrangler CLI

```bash
npm install -g wrangler
```

Ou utiliser npm directement :
```bash
npx wrangler --version
```

#### Étape 2 : Se connecter à Cloudflare

```bash
wrangler login
```

Cela ouvrira votre navigateur pour vous connecter à Cloudflare.

#### Étape 3 : Créer les projets Cloudflare Pages

Pour chaque application, créez un projet séparé :

##### 3.1. Client Dashboard

1. Allez sur https://dash.cloudflare.com
2. Sélectionnez **Pages** dans le menu latéral
3. Cliquez sur **Create a project** > **Connect to Git**
4. Sélectionnez votre repository
5. Configurez le projet :
   - **Project name** : `notary-client-dashboard`
   - **Production branch** : `main` (ou votre branche principale)
   - **Framework preset** : `Vite`
   - **Build command** : `cd client-dashboard && npm run build`
   - **Build output directory** : `client-dashboard/dist`
   - **Root directory** : `/` (racine du repo)

##### 3.2. Admin Dashboard

Répétez les étapes pour l'admin dashboard :
- **Project name** : `notary-admin-dashboard`
- **Build command** : `cd notary-admin && npm run build`
- **Build output directory** : `notary-admin/dist`

##### 3.3. Formulaire Principal (optionnel)

Si vous déployez aussi le formulaire principal :
- **Project name** : `notary-main-form`
- **Build command** : `npm run build`
- **Build output directory** : `dist`

#### Étape 4 : Configurer les Variables d'Environnement

Pour chaque projet, ajoutez les variables d'environnement :

1. Dans les paramètres du projet Cloudflare Pages
2. Allez dans **Settings** > **Environment variables**
3. Ajoutez les variables suivantes pour **Production**, **Preview** et **Branch previews** :

```
VITE_SUPABASE_URL = https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY = votre_anon_key_ici
```

**⚠️ Important** : Ces variables doivent commencer par `VITE_` pour être accessibles dans Vite.

Pour trouver vos credentials Supabase :
- URL : Dashboard Supabase > Settings > API > Project URL
- Anon Key : Dashboard Supabase > Settings > API > Project API keys > `anon` `public`

#### Étape 5 : Déployer

1. Cloudflare Pages va automatiquement builder et déployer après chaque push
2. Le premier déploiement peut prendre 5-10 minutes
3. Vous recevrez une URL Cloudflare Pages (ex: `https://notary-client-dashboard.pages.dev`)

### Méthode 2 : Déploiement via Wrangler CLI

#### Étape 1 : Builder localement

```bash
# Client Dashboard
cd client-dashboard
npm install
npm run build

# Admin Dashboard
cd ../notary-admin
npm install
npm run build
```

#### Étape 2 : Déployer avec Wrangler

```bash
# Depuis la racine du projet
wrangler pages deploy client-dashboard/dist --project-name=notary-client-dashboard
wrangler pages deploy notary-admin/dist --project-name=notary-admin-dashboard
```

**Note** : Cette méthode nécessite de configurer les variables d'environnement via le dashboard Cloudflare avant le déploiement.

## 🌐 Configuration des Sous-domaines

### Option 1 : Sous-domaines Cloudflare Pages (Gratuit)

Chaque projet Cloudflare Pages peut avoir un sous-domaine personnalisé :

1. Dans les paramètres du projet : **Custom domains**
2. Cliquez sur **Set up a custom domain**
3. Entrez votre sous-domaine (ex: `client.votredomaine.com`)
4. Suivez les instructions pour configurer les DNS

### Option 2 : Configuration DNS dans Cloudflare

Si votre domaine est géré par Cloudflare :

1. Allez dans **DNS** > **Records**
2. Ajoutez un enregistrement CNAME pour chaque sous-domaine :
   - **Type** : CNAME
   - **Name** : `client` (pour client.votredomaine.com)
   - **Target** : `notary-client-dashboard.pages.dev`
   - **Proxy status** : Proxied (orange cloud)

Répétez pour :
- `admin` → `notary-admin-dashboard.pages.dev`
- `app` → `notary-main-form.pages.dev` (si applicable)

### Option 3 : Domaine personnalisé externe

Si votre domaine n'est pas sur Cloudflare :

1. Ajoutez les enregistrements CNAME dans votre fournisseur DNS
2. Dans Cloudflare Pages, ajoutez le domaine personnalisé
3. Suivez les instructions pour vérifier la propriété du domaine

## 🔄 Déploiements Automatiques

Avec la Méthode 1 (Git), chaque push sur la branche configurée déclenchera automatiquement :

1. Un nouveau build
2. Des tests (si configurés)
3. Un déploiement automatique

### Deploy Previews

Cloudflare Pages crée automatiquement des previews pour les Pull Requests, parfait pour tester avant de merger !

Les previews sont accessibles via :
- URL unique générée pour chaque PR
- Variables d'environnement de preview disponibles

## 🔒 Headers de Sécurité

Les fichiers `public/_headers` incluent des headers de sécurité :

- `X-Frame-Options: DENY` - Empêche le clickjacking
- `X-XSS-Protection: 1; mode=block` - Protection XSS
- `X-Content-Type-Options: nosniff` - Empêche le MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Contrôle du referrer
- `Permissions-Policy` - Contrôle des APIs du navigateur
- `Cache-Control` - Cache pour les assets statiques

Ces headers sont automatiquement appliqués par Cloudflare Pages.

## 🔀 Gestion des Routes (SPA)

Le fichier `public/_redirects` assure que toutes les routes sont gérées par React Router :

```
/*    /index.html   200
```

Cela garantit que les rafraîchissements sur `/dashboard` ou `/profile` fonctionnent correctement.

## 🐛 Troubleshooting

### Problème : 404 sur les routes

**Symptôme** : Refresh sur `/dashboard` ou `/profile` retourne une 404

**Solution** : Vérifiez que le fichier `public/_redirects` existe et contient :
```
/*    /index.html   200
```

### Problème : Variables d'environnement non définies

**Symptôme** : `VITE_SUPABASE_URL` est `undefined` dans l'app

**Solutions** :
1. Vérifiez que les variables commencent par `VITE_`
2. Redéployez après avoir ajouté les variables
3. Vérifiez qu'il n'y a pas d'espaces dans les valeurs
4. Assurez-vous que les variables sont définies pour l'environnement correct (Production/Preview)

### Problème : Build échoue

**Symptôme** : Erreur pendant `npm run build`

**Solutions** :
1. Testez le build en local : `cd client-dashboard && npm run build`
2. Vérifiez les logs Cloudflare Pages pour l'erreur exacte
3. Assurez-vous que `package.json` contient toutes les dépendances
4. Vérifiez que le Node.js version est compatible (Cloudflare Pages utilise Node.js 18 par défaut)

### Problème : Erreurs CORS

**Symptôme** : Erreurs CORS lors des appels à Supabase

**Solution** : Ajoutez vos domaines Cloudflare dans Supabase :
1. Dashboard Supabase > Authentication > URL Configuration
2. Ajoutez vos URLs Cloudflare dans **"Site URL"** et **"Redirect URLs"**
3. Incluez tous les sous-domaines : `client.votredomaine.com`, `admin.votredomaine.com`, etc.

### Problème : Sous-domaine ne fonctionne pas

**Symptôme** : Le sous-domaine ne se charge pas ou affiche une erreur

**Solutions** :
1. Vérifiez que le CNAME est correctement configuré dans DNS
2. Attendez la propagation DNS (peut prendre jusqu'à 48h, mais généralement quelques minutes)
3. Vérifiez que le domaine est bien ajouté dans Cloudflare Pages
4. Vérifiez que le SSL/TLS est activé (automatique avec Cloudflare)

## 📊 Monitoring et Analytics

### Build Status

Cloudflare Pages affiche le statut des builds dans le dashboard :
- ✅ Succès
- ❌ Échec
- ⏳ En cours

### Analytics

Cloudflare Pages offre des analytics :
- Allez dans **Analytics** dans le dashboard du projet
- Consultez les métriques de performance
- Surveillez les erreurs et les performances

### Logs

Les logs de build et d'exécution sont disponibles dans :
- **Deployments** > Sélectionnez un déploiement > **View build log**
- **Functions** > Logs (si vous utilisez Cloudflare Workers)

## 🔐 SSL/TLS

Cloudflare fournit automatiquement des certificats SSL gratuits :
- Certificats SSL automatiques pour tous les domaines
- HTTPS forcé par défaut
- Support de TLS 1.3
- Pas de configuration supplémentaire nécessaire

## 🚀 Optimisations Cloudflare

### Cache

Cloudflare Pages met automatiquement en cache :
- Assets statiques (JS, CSS, images)
- Headers de cache configurés dans `_headers`

### CDN Global

Tous les sites Cloudflare Pages sont automatiquement servis via le CDN global de Cloudflare :
- Plus de 200 datacenters dans le monde
- Réduction de la latence
- Amélioration des performances

### Compression

Cloudflare compresse automatiquement :
- Brotli pour les navigateurs compatibles
- Gzip pour les autres
- Amélioration des temps de chargement

## 📚 Ressources

- [Documentation Cloudflare Pages](https://developers.cloudflare.com/pages)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Déploiement Vite sur Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/vite/)
- [Supabase avec Cloudflare](https://supabase.com/docs/guides/hosting/cloudflare)
- [Configuration des domaines personnalisés](https://developers.cloudflare.com/pages/platform/custom-domains/)

## 🎉 C'est tout !

Vos applications devraient maintenant être déployées et accessibles publiquement sur Cloudflare Pages avec des sous-domaines séparés !

Pour toute question ou problème, consultez :
- Les logs de build sur Cloudflare Pages
- La documentation Cloudflare Pages
- Le support Cloudflare (dans le dashboard)

## 📝 Checklist de Déploiement

- [ ] Compte Cloudflare créé
- [ ] Wrangler CLI installé et connecté
- [ ] Repository connecté à Cloudflare Pages
- [ ] Projet Client Dashboard créé
- [ ] Projet Admin Dashboard créé
- [ ] Variables d'environnement configurées pour chaque projet
- [ ] Premier déploiement réussi
- [ ] Sous-domaines configurés dans DNS
- [ ] Domaines personnalisés ajoutés dans Cloudflare Pages
- [ ] URLs Supabase configurées avec les nouveaux domaines
- [ ] Tests effectués sur chaque sous-domaine
- [ ] Headers de sécurité vérifiés
- [ ] Routes SPA testées (refresh sur les routes)

---

**Déployé avec ❤️ sur Cloudflare Pages**


# 🚀 Déploiement sur Netlify - Client Dashboard

Guide complet pour déployer l'application Client Dashboard sur Netlify.

## 📋 Prérequis

- Compte Netlify (gratuit) : https://www.netlify.com
- Compte GitHub/GitLab/Bitbucket avec ce repository
- Variables d'environnement Supabase (URL et Anon Key)

## 🔧 Fichiers de Configuration

Les fichiers suivants ont été créés pour Netlify :

### 1. `netlify.toml` (racine du projet client-dashboard)
Configure le build et les redirects pour React Router.

### 2. `public/_redirects`
Assure que toutes les routes sont gérées par React Router (SPA).

### 3. `.env.example`
Template pour les variables d'environnement requises.

## 📝 Instructions de Déploiement

### Méthode 1 : Déploiement via Git (Recommandé)

#### Étape 1 : Connecter votre Repository

1. Allez sur https://app.netlify.com
2. Cliquez sur **"Add new site"** > **"Import an existing project"**
3. Choisissez votre provider Git (GitHub, GitLab, Bitbucket)
4. Autorisez Netlify à accéder à vos repositories
5. Sélectionnez le repository `my-notary-form`

#### Étape 2 : Configurer le Build

Netlify devrait détecter automatiquement les paramètres grâce au `netlify.toml`, mais vérifiez :

- **Base directory** : `client-dashboard`
- **Build command** : `npm run build`
- **Publish directory** : `client-dashboard/dist`
- **Branch to deploy** : `main` (ou votre branche principale)

#### Étape 3 : Ajouter les Variables d'Environnement

1. Dans les paramètres du site Netlify, allez dans **"Site settings"** > **"Environment variables"**
2. Ajoutez les variables suivantes :

```
VITE_SUPABASE_URL = https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY = votre_anon_key_ici
```

**⚠️ Important** : Ces variables doivent commencer par `VITE_` pour être accessibles dans Vite.

Pour trouver vos credentials Supabase :
- URL : Dashboard Supabase > Settings > API > Project URL
- Anon Key : Dashboard Supabase > Settings > API > Project API keys > `anon` `public`

#### Étape 4 : Déployer

1. Cliquez sur **"Deploy site"**
2. Attendez que le build se termine (environ 2-5 minutes)
3. Votre site sera disponible sur un domaine Netlify (ex: `https://random-name-123.netlify.app`)

### Méthode 2 : Déploiement Manual (Drag & Drop)

#### Étape 1 : Builder localement

```bash
cd client-dashboard
npm install
npm run build
```

#### Étape 2 : Drag & Drop sur Netlify

1. Allez sur https://app.netlify.com
2. Faites glisser le dossier `client-dashboard/dist` sur la zone de drop
3. Ajoutez les variables d'environnement (voir Méthode 1, Étape 3)
4. Redéployez avec les nouvelles variables

**⚠️ Note** : Cette méthode ne permet pas les déploiements automatiques. Préférez la Méthode 1.

## 🌐 Configuration du Domaine Personnalisé (Optionnel)

### Changer le nom du site

1. Dans les paramètres du site : **"Site settings"** > **"Site details"**
2. Cliquez sur **"Change site name"**
3. Entrez un nom (ex: `my-notary-dashboard`)
4. Votre site sera accessible sur `https://my-notary-dashboard.netlify.app`

### Ajouter un domaine personnalisé

1. Dans les paramètres du site : **"Domain management"**
2. Cliquez sur **"Add custom domain"**
3. Suivez les instructions pour configurer vos DNS

## 🔄 Déploiements Automatiques

Avec la Méthode 1 (Git), chaque push sur la branche configurée déclenchera automatiquement :
1. Un nouveau build
2. Des tests (si configurés)
3. Un déploiement automatique

### Deploy Previews

Netlify crée automatiquement des previews pour les Pull Requests, parfait pour tester avant de merger !

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

### Problème : Build échoue

**Symptôme** : Erreur pendant `npm run build`

**Solutions** :
1. Testez le build en local : `npm run build`
2. Vérifiez les logs Netlify pour l'erreur exacte
3. Assurez-vous que `package.json` contient toutes les dépendances

### Problème : Erreurs CORS

**Symptôme** : Erreurs CORS lors des appels à Supabase

**Solution** : Ajoutez votre domaine Netlify dans Supabase :
1. Dashboard Supabase > Authentication > URL Configuration
2. Ajoutez votre URL Netlify dans **"Site URL"** et **"Redirect URLs"**

## 📊 Monitoring et Analytics

### Build Status Badge

Ajoutez un badge de statut à votre README :

```markdown
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE-NAME/deploys)
```

### Analytics

Netlify offre des analytics gratuites :
- Allez dans **"Analytics"** dans le dashboard
- Activez Netlify Analytics (peut nécessiter un plan payant)

## 🔒 Sécurité

### Headers de Sécurité

Le `netlify.toml` inclut déjà des headers de sécurité :
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### HTTPS

Netlify fournit automatiquement des certificats SSL gratuits via Let's Encrypt.

### Variables d'Environnement

⚠️ **NE JAMAIS** commiter les fichiers `.env` contenant vos vraies clés !
- Les `.env` sont dans `.gitignore`
- Utilisez uniquement `.env.example` comme template
- Configurez les vraies valeurs dans Netlify UI

## 📚 Ressources

- [Documentation Netlify](https://docs.netlify.com)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)
- [Déploiement Vite sur Netlify](https://vitejs.dev/guide/static-deploy.html#netlify)
- [Supabase avec Netlify](https://supabase.com/docs/guides/hosting/netlify)

## 🎉 C'est tout !

Votre application devrait maintenant être déployée et accessible publiquement sur Netlify !

Pour toute question ou problème, consultez :
- Les logs de build sur Netlify
- La documentation Netlify
- Le support Netlify (dans le dashboard)

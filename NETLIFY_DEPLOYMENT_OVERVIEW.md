# Netlify Deployment Overview

Ce document fournit un aperçu du déploiement de toutes les applications sur Netlify.

## Applications à déployer

1. **Client Dashboard** (`client-dashboard/`)
2. **Notary Dashboard** (`notary-dashboard/`)
3. **Notary Admin Dashboard** (`notary-admin/`)

## Structure des fichiers Netlify

Chaque application a:
- `netlify.toml` - Configuration Netlify principale
- `public/_redirects` - Redirections pour le routing SPA
- `NETLIFY_DEPLOYMENT.md` - Guide de déploiement spécifique

## Déploiement de chaque application

### Option 1: Déploiement séparé (Recommandé)

Chaque application doit être déployée comme un site Netlify séparé :

1. **Client Dashboard**
   - Base directory: `client-dashboard`
   - Build command: `npm run build`
   - Publish directory: `client-dashboard/dist`

2. **Notary Dashboard**
   - Base directory: `notary-dashboard`
   - Build command: `npm run build`
   - Publish directory: `notary-dashboard/dist`

3. **Notary Admin Dashboard**
   - Base directory: `notary-admin`
   - Build command: `npm run build`
   - Publish directory: `notary-admin/dist`

### Option 2: Monorepo avec Netlify

Si vous préférez un seul site Netlify avec plusieurs applications, vous devrez:
1. Utiliser des sous-chemins (ex: `/client`, `/notary`, `/admin`)
2. Configurer les redirections dans `netlify.toml`
3. Ajuster les routes dans chaque application React

## Variables d'environnement

Pour chaque site Netlify, définissez:
- `VITE_SUPABASE_URL` - URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY` - Clé anonyme de Supabase

## Configuration Netlify

### Fichiers `netlify.toml`

Chaque fichier contient:
- Configuration de build
- Headers de sécurité
- Cache pour les assets statiques
- Redirections SPA
- Configuration Node.js

### Fichiers `_redirects`

Tous les fichiers `_redirects` sont identiques et servent à:
- Rediriger toutes les routes vers `index.html` pour le routing côté client
- Gérer les erreurs 404 avec le routing React

## Déploiement rapide

### Via Netlify UI

1. Allez sur [app.netlify.com](https://app.netlify.com)
2. Créez 3 nouveaux sites (un pour chaque application)
3. Connectez votre repository Git
4. Configurez les paramètres de build pour chaque site
5. Définissez les variables d'environnement
6. Déployez

### Via Netlify CLI

```bash
# Pour chaque application
cd client-dashboard  # ou notary-dashboard, notary-admin
netlify init
netlify env:set VITE_SUPABASE_URL "your-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-key"
netlify deploy --prod
```

## Domaines personnalisés

Pour chaque application, vous pouvez:
1. Ajouter un domaine personnalisé dans les paramètres Netlify
2. Configurer DNS selon les instructions
3. Netlify provisionnera automatiquement les certificats SSL

Exemples:
- Client Dashboard: `client.yourdomain.com`
- Notary Dashboard: `notary.yourdomain.com`
- Admin Dashboard: `admin.yourdomain.com`

## Checklist de déploiement

Pour chaque application:

- [ ] Code poussé vers Git
- [ ] Site Netlify créé
- [ ] Base directory configuré
- [ ] Build command configuré
- [ ] Publish directory configuré
- [ ] Variables d'environnement définies
- [ ] Premier déploiement réussi
- [ ] Tests de routing fonctionnels
- [ ] Tests d'authentification fonctionnels
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] SSL activé automatiquement

## Support

Pour des problèmes spécifiques:
1. Consultez le guide `NETLIFY_DEPLOYMENT.md` de chaque application
2. Vérifiez les logs de build dans Netlify
3. Vérifiez la console du navigateur pour les erreurs runtime
4. Consultez la [documentation Netlify](https://docs.netlify.com/)


# 🔧 Correction de Configuration Cloudflare Pages - Client Dashboard

## ❌ Problème Identifié

Les logs montrent que Cloudflare Pages :
1. Clone le repo à la racine
2. Installe les dépendances à la racine
3. Exécute `npm run build` à la racine (build le projet racine, pas client-dashboard)
4. Cherche `client-dashboard/dist` mais ne le trouve pas (car le build a créé `dist` à la racine)

**Erreur** : `Error: Output directory "client-dashboard/dist" not found.`

## ✅ Solution : Configuration Correcte

Dans Cloudflare Pages, pour le **Client Dashboard**, configurez :

### Configuration Recommandée (Option 1 - Meilleure)

1. **Framework preset** : `Vite` (ou laissez `None`)
2. **Build command** : `npm run build`
3. **Build output directory** : `dist` ⚠️ **PAS `client-dashboard/dist`**
4. **Root directory (advanced)** → **Path** : `client-dashboard` ⚠️ **C'EST LA CLÉ !**

**Explication** : Quand vous définissez le Root Directory à `client-dashboard`, Cloudflare :
- Change automatiquement dans le dossier `client-dashboard` avant d'exécuter les commandes
- Installe les dépendances dans `client-dashboard/` (cherche `package.json` dans `client-dashboard/`)
- Exécute `npm run build` depuis `client-dashboard/`
- Le build crée `client-dashboard/dist/`
- Mais pour le Build output directory, vous devez mettre juste `dist` (pas `client-dashboard/dist`) car Cloudflare cherche relativement au Root Directory

### Configuration Alternative (Option 2)

Si l'Option 1 ne fonctionne pas, essayez :

1. **Framework preset** : `Vite` (ou `None`)
2. **Build command** : `cd client-dashboard && npm install && npm run build`
3. **Build output directory** : `client-dashboard/dist`
4. **Root directory (advanced)** → **Path** : `/` (ou laissez vide)

## 📝 Résumé des Configurations

### Client Dashboard

| Paramètre | Valeur |
|-----------|--------|
| **Root directory** | `client-dashboard` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Framework preset** | `Vite` |

### Admin Dashboard

| Paramètre | Valeur |
|-----------|--------|
| **Root directory** | `notary-admin` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Framework preset** | `Vite` |

### Formulaire Principal

| Paramètre | Valeur |
|-----------|--------|
| **Root directory** | `/` (ou vide) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Framework preset** | `Vite` |

## 🔍 Vérification

Après avoir configuré, les logs devraient montrer :

```
Using v2 root directory strategy
Success: Finished cloning repository files
Installing project dependencies in client-dashboard/: npm clean-install --progress=false
Executing user command: npm run build
[... build output ...]
Validating asset output directory
Success: Output directory "dist" found.
```

## ⚠️ Note sur wrangler.toml

**IMPORTANT** : Les fichiers `wrangler.toml` ne sont **PAS nécessaires** pour Cloudflare Pages et peuvent causer des erreurs. Cloudflare Pages utilise uniquement la configuration de l'interface web. 

Si vous avez des fichiers `wrangler.toml` dans votre repository, supprimez-les car :
- Cloudflare Pages lit le `wrangler.toml` à la racine
- La section `[build]` n'est pas supportée pour les projets Pages
- Cela cause l'erreur : "Configuration file for Pages projects does not support 'build'"

La configuration se fait **uniquement** via l'interface web de Cloudflare Pages (Settings > Builds & deployments).

## 🚀 Prochaines Étapes

1. Allez dans votre projet Cloudflare Pages
2. **Settings** > **Builds & deployments**
3. Modifiez la configuration selon l'Option 1 ci-dessus
4. **IMPORTANT** : Vérifiez que **Production branch** est configuré sur `main` (pas sur une branche de feature)
5. Cliquez sur **Save and Deploy**
6. Vérifiez les logs pour confirmer que le build fonctionne

## ⚠️ Erreur "an internal error occurred"

Si vous rencontrez cette erreur après avoir configuré le Root Directory :

1. **Vérifiez la branche de production** : Elle doit être `main` (ou votre branche principale)
2. **Vérifiez le Root Directory** : Il doit être exactement `client-dashboard` (sans slash, sans espaces)
3. **Réessayez le déploiement** : Parfois c'est une erreur temporaire
4. **Créez un nouveau déploiement** : Deployments > Create deployment > Sélectionnez `main`

Pour plus de détails, consultez `CLOUDFLARE_TROUBLESHOOTING.md`


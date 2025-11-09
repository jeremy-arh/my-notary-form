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

Cloudflare Pages cherche `wrangler.toml` à la racine du repo, pas dans les sous-dossiers. Les fichiers `wrangler.toml` dans `client-dashboard/` et `notary-admin/` sont pour référence/documentation, mais la configuration se fait principalement via l'interface web de Cloudflare Pages.

## 🚀 Prochaines Étapes

1. Allez dans votre projet Cloudflare Pages
2. **Settings** > **Builds & deployments**
3. Modifiez la configuration selon l'Option 1 ci-dessus
4. Cliquez sur **Save and Deploy**
5. Vérifiez les logs pour confirmer que le build fonctionne


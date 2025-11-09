# 🔧 Correction : Erreur wrangler.toml avec Cloudflare Pages

## ❌ Erreur Rencontrée

```
✘ [ERROR] Running configuration file validation for Pages:
   - Configuration file for Pages projects does not support "build"
Failed: unable to read wrangler.toml file with code: 1
```

## 🔍 Cause du Problème

Cloudflare Pages détecte le fichier `wrangler.toml` à la racine du repository et essaie de le lire. Cependant, les projets Cloudflare Pages **ne supportent pas** la section `[build]` dans `wrangler.toml`.

Les fichiers `wrangler.toml` sont utilisés pour **Cloudflare Workers**, pas pour **Cloudflare Pages**.

## ✅ Solution

**Supprimez tous les fichiers `wrangler.toml`** du repository car :

1. Ils ne sont **pas nécessaires** pour Cloudflare Pages
2. La configuration se fait **uniquement** via l'interface web de Cloudflare Pages
3. Ils causent des erreurs de validation

### Fichiers à Supprimer

- `wrangler.toml` (à la racine)
- `client-dashboard/wrangler.toml`
- `notary-admin/wrangler.toml`

### Configuration via Interface Web

Pour Cloudflare Pages, configurez tout via l'interface web :

1. **Settings** > **Builds & deployments**
2. Configurez :
   - **Production branch** : `main`
   - **Framework preset** : `Vite` (ou `None`)
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
   - **Root directory (advanced)** → **Path** : `client-dashboard`

## 📝 Différence entre Workers et Pages

| Fonctionnalité | Cloudflare Workers | Cloudflare Pages |
|----------------|-------------------|------------------|
| Configuration | `wrangler.toml` requis | Interface web uniquement |
| Section `[build]` | Supportée | ❌ Non supportée |
| Déploiement | `wrangler deploy` | Interface web ou Git |
| Fichier de config | `wrangler.toml` | Pas nécessaire |

## 🚀 Après la Suppression

Une fois les fichiers `wrangler.toml` supprimés :

1. Committez et poussez les changements sur GitHub
2. Cloudflare Pages va automatiquement redéployer
3. L'erreur devrait disparaître
4. Le build devrait fonctionner correctement

## ✅ Vérification

Après avoir supprimé les fichiers `wrangler.toml`, les logs devraient montrer :

```
Cloning repository...
Success: Finished cloning repository files
No wrangler.toml file found. Continuing.
Installing project dependencies...
Executing user command: npm run build
[... build output ...]
Success: Output directory "dist" found.
```

## 📚 Documentation

Pour plus d'informations :
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages)
- [Configuration via Interface Web](https://developers.cloudflare.com/pages/platform/build-configuration)

---

**Note** : Les fichiers `wrangler.toml` ont été supprimés du repository. La configuration se fait maintenant exclusivement via l'interface web de Cloudflare Pages.


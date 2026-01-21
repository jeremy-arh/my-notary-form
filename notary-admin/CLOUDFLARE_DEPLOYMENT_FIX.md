# Correction du problème de déploiement Cloudflare Pages

## Problème

L'erreur suivante se produit lors du déploiement sur Cloudflare Pages :

```
npm error code EINTEGRITY
npm error sha512-... integrity checksum failed
```

Cela indique que les checksums SHA512 dans le `package-lock.json` ne correspondent pas aux packages téléchargés depuis le registre npm.

## Solution

### Option 1 : Régénérer le package-lock.json localement (Recommandé)

1. **Sur votre machine locale**, exécutez le script PowerShell :

```powershell
.\scripts\regenerate-package-lock.ps1
```

Ou manuellement :

```powershell
# Nettoyer le cache npm
npm cache clean --force

# Supprimer le package-lock.json existant
Remove-Item package-lock.json -Force

# Supprimer node_modules (optionnel mais recommandé)
Remove-Item node_modules -Recurse -Force

# Réinstaller les dépendances pour régénérer le package-lock.json
npm install --legacy-peer-deps
```

2. **Vérifiez** que le nouveau `package-lock.json` a été créé

3. **Commitez et poussez** les changements :

```bash
git add package-lock.json
git commit -m "fix: régénérer package-lock.json pour corriger les checksums"
git push
```

4. **Redéployez** sur Cloudflare Pages

### Option 2 : Utiliser npm ci avec ignore-scripts

Si la régénération ne fonctionne pas, vous pouvez modifier temporairement la commande de build dans Cloudflare Pages pour ignorer les erreurs d'intégrité (non recommandé pour la production) :

Dans les paramètres de build Cloudflare Pages, utilisez :

```bash
npm install --legacy-peer-deps --no-audit --no-fund --ignore-scripts && npm run build
```

### Option 3 : Mettre à jour les dépendances

Parfois, le problème vient de dépendances obsolètes. Essayez de mettre à jour les dépendances :

```bash
npm update --legacy-peer-deps
npm install --legacy-peer-deps
```

## Fichiers modifiés

- ✅ `wrangler.toml` - Configuration Cloudflare Pages créée
- ✅ `.npmrc` - Options npm mises à jour
- ✅ `scripts/regenerate-package-lock.ps1` - Script PowerShell pour régénérer le lockfile
- ✅ `scripts/regenerate-package-lock.js` - Script Node.js alternatif

## Vérification

Après avoir régénéré le `package-lock.json`, vérifiez que :

1. Le fichier `package-lock.json` existe
2. Les checksums sont corrects (vous pouvez tester avec `npm ci` localement)
3. Le déploiement Cloudflare fonctionne

## Notes

- Le fichier `wrangler.toml` a été créé pour configurer Cloudflare Pages
- La commande de build nettoie automatiquement le cache npm avant l'installation
- Assurez-vous que votre version de Node.js (22) correspond à celle configurée dans Cloudflare Pages

# 🔄 Redéploiement Cloudflare Pages après Modification des Variables

## ⚠️ Important

Les variables d'environnement Vite sont intégrées **au moment du BUILD**. Si vous modifiez une variable d'environnement dans Cloudflare Pages, vous DEVEZ redéployer pour que les changements soient pris en compte.

## 🚀 Méthodes de Redéploiement

### Méthode 1 : Redéploiement via l'Interface Cloudflare (Recommandé)

1. Allez sur https://dash.cloudflare.com
2. Sélectionnez votre projet Cloudflare Pages (ex: `notary-dashboard`, `notary-client-dashboard`, etc.)
3. Allez dans l'onglet **Deployments**
4. Trouvez le dernier déploiement (Production ou Preview)
5. Cliquez sur les **3 points** (⋯) à droite du déploiement
6. Sélectionnez **Retry deployment**

OU

1. Allez dans **Deployments**
2. Cliquez sur **Create deployment** (en haut à droite)
3. Sélectionnez la branche `main` (ou votre branche de production)
4. Cliquez sur **Deploy**

### Méthode 2 : Déclencher un Déploiement via Git

1. Faites un petit changement dans votre code (ex: ajouter un commentaire dans un fichier)
2. Committez et poussez sur GitHub :
   ```bash
   git add .
   git commit -m "Trigger: Redéploiement après modification variables d'environnement"
   git push origin main
   ```
3. Cloudflare Pages va automatiquement détecter le push et redéployer

### Méthode 3 : Redéploiement via Wrangler CLI

Si vous avez Wrangler CLI installé :

```bash
wrangler pages deployment tail --project-name=notary-dashboard
# Puis dans l'interface Cloudflare, créez un nouveau déploiement
```

## ⏱️ Temps d'Attente

- **Premier déploiement** : 5-10 minutes
- **Redéploiement** : 2-5 minutes
- **Déploiement incrémental** : 1-3 minutes

## ✅ Vérification

Après le redéploiement :

1. Attendez que le build se termine (statut ✅ vert)
2. Ouvrez votre application déployée
3. Ouvrez la console du navigateur (F12)
4. Vérifiez que les nouvelles variables sont disponibles :
   - `📍 URL:` devrait afficher votre nouvelle URL Supabase (si modifiée)
   - `✅ Valid credentials: true`
   - Pas de message "SUPABASE NOT CONFIGURED"

## 🔍 Vérifier les Logs de Build

Pour vérifier que les nouvelles variables sont bien intégrées :

1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Cliquez sur **View build log**
4. Cherchez la section "CHECKING ENVIRONMENT VARIABLES"
5. Vérifiez que les variables affichent `✅ Set` avec les nouvelles valeurs

## 📝 Notes Importantes

- ⚠️ Les variables sont intégrées au BUILD, pas au runtime
- ⚠️ Vous DEVEZ redéployer après chaque modification de variable
- ⚠️ Les variables doivent être définies pour **Production**, **Preview** et **Branch previews** si nécessaire
- ⚠️ Videz le cache du navigateur (Ctrl+Shift+Delete) si les changements ne sont pas visibles

## 🐛 Problèmes Courants

### Les nouvelles variables ne sont toujours pas disponibles

**Solution** :
1. Vérifiez que vous avez bien redéployé (pas seulement sauvegardé)
2. Vérifiez que les variables sont définies pour le bon environnement (Production)
3. Vérifiez les logs de build pour confirmer que les variables sont disponibles
4. Videz le cache du navigateur

### Le build échoue après modification des variables

**Solution** :
1. Vérifiez le format des variables (pas d'espaces, pas de guillemets)
2. Vérifiez que les valeurs sont correctes
3. Consultez les logs de build pour l'erreur exacte

---

**Rappel** : Après chaque modification de variable d'environnement dans Cloudflare Pages, vous DEVEZ redéployer pour que les changements soient pris en compte dans l'application.


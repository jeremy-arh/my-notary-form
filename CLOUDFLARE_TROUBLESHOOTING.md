# 🔧 Dépannage Cloudflare Pages

## ❌ Erreur : "an internal error occurred"

Cette erreur peut avoir plusieurs causes. Voici comment la résoudre :

### 1. Vérifier la Branche de Production

**Problème** : Cloudflare Pages essaie de déployer depuis une branche qui n'existe pas ou qui n'est pas à jour.

**Solution** :
1. Allez dans **Settings** > **Builds & deployments**
2. Vérifiez que **Production branch** est configuré sur `main` (ou votre branche principale)
3. Si vous utilisez une autre branche (ex: `claude/notary-service-form-011CULh1HC1rRxzrHXMscVzY`), assurez-vous qu'elle existe sur GitHub
4. Cliquez sur **Save** et relancez le déploiement

### 2. Vérifier la Configuration du Root Directory

**Problème** : Le Root Directory est mal configuré ou contient des caractères incorrects.

**Solution pour Client Dashboard** :
1. Allez dans **Settings** > **Builds & deployments**
2. Dans la section **Build configuration**, développez **Root directory (advanced)**
3. Vérifiez que **Path** est exactement : `client-dashboard` (sans slash au début, sans slash à la fin)
4. **Build output directory** doit être : `dist` (pas `client-dashboard/dist`)
5. Cliquez sur **Save** et relancez le déploiement

### 3. Vérifier les Variables d'Environnement

**Problème** : Des variables d'environnement mal configurées peuvent causer des erreurs internes.

**Solution** :
1. Allez dans **Settings** > **Environment variables**
2. Vérifiez que les variables sont définies pour **Production**, **Preview** et **Branch previews**
3. Vérifiez qu'il n'y a pas d'espaces dans les noms ou valeurs
4. Vérifiez que les valeurs commencent bien par `VITE_` pour Vite

### 4. Réessayer le Déploiement

**Problème** : Erreur temporaire de Cloudflare.

**Solution** :
1. Allez dans **Deployments**
2. Cliquez sur **Retry deployment** sur le dernier déploiement
3. Si l'erreur persiste, attendez quelques minutes et réessayez

### 5. Vérifier les Logs Détaillés

**Problème** : L'erreur se produit avant que les logs ne soient disponibles.

**Solution** :
1. Allez dans **Deployments**
2. Cliquez sur le déploiement qui a échoué
3. Consultez les **Build logs** pour voir où exactement l'erreur se produit
4. Si les logs s'arrêtent avant le build, c'est probablement un problème de configuration

### 6. Créer un Nouveau Déploiement

**Problème** : Le déploiement est corrompu ou utilise une ancienne configuration.

**Solution** :
1. Allez dans **Deployments**
2. Cliquez sur **Create deployment**
3. Sélectionnez la branche `main` (ou votre branche de production)
4. Cliquez sur **Deploy**

### 7. Vérifier le Repository GitHub

**Problème** : Le repository GitHub a des problèmes ou le commit n'existe pas.

**Solution** :
1. Vérifiez sur GitHub que le commit `abb62c5` existe bien sur la branche `main`
2. Vérifiez que le repository est accessible publiquement (ou que Cloudflare a les bonnes permissions)
3. Vérifiez que la branche `main` existe et contient les fichiers nécessaires

### 8. Configuration Recommandée pour Client Dashboard

Si vous rencontrez des erreurs, utilisez cette configuration exacte :

```
Project name: notary-client-dashboard
Production branch: main
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory (advanced) → Path: client-dashboard
```

### 9. Contacter le Support Cloudflare

Si aucune des solutions ci-dessus ne fonctionne :

1. Allez sur https://cfl.re/3WgEyrH (lien dans l'erreur)
2. Rassemblez les informations suivantes :
   - Nom du projet Cloudflare Pages
   - ID du déploiement qui a échoué
   - Capture d'écran de la configuration
   - Logs du déploiement (si disponibles)
3. Contactez le support Cloudflare avec ces informations

## ✅ Checklist de Vérification

Avant de redéployer, vérifiez :

- [ ] La branche de production est `main` (ou la bonne branche)
- [ ] Le Root Directory est configuré correctement (`client-dashboard`)
- [ ] Le Build output directory est `dist` (pas `client-dashboard/dist`)
- [ ] Les variables d'environnement sont définies
- [ ] Le commit existe sur GitHub
- [ ] Le repository est accessible
- [ ] Aucune erreur dans les logs précédents

## 🔄 Solution Rapide

Si vous voulez réessayer rapidement :

1. **Settings** > **Builds & deployments**
2. Vérifiez la configuration (voir section 8)
3. Cliquez sur **Save**
4. **Deployments** > **Create deployment** > Sélectionnez `main` > **Deploy**

## 📝 Notes

- Les erreurs internes de Cloudflare sont souvent temporaires
- Attendez 2-3 minutes entre les tentatives
- Vérifiez toujours les logs avant de contacter le support
- Assurez-vous que la configuration est exactement comme indiqué (pas d'espaces, pas de slashes supplémentaires)


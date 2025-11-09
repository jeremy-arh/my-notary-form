# 🔧 Résolution : Variables d'environnement non disponibles après déploiement

## ❌ Problème

Les variables d'environnement sont configurées dans Cloudflare Pages, mais l'application affiche toujours les valeurs par défaut (placeholder) :
- `URL: https://placeholder.supabase.co`
- `Valid credentials: false`
- Erreur : "SUPABASE NOT CONFIGURED"

## 🔍 Cause

**Les variables d'environnement Vite sont intégrées au moment du BUILD**, pas au runtime.

Si vous avez ajouté les variables d'environnement **après** le build, elles ne seront pas disponibles dans l'application déployée.

## ✅ Solution

### Étape 1 : Vérifier les Variables d'Environnement

1. Allez dans votre projet Cloudflare Pages
2. **Settings** > **Environment variables**
3. Vérifiez que les variables sont définies pour **Production** :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY` (si nécessaire)
   - `VITE_SUPABASE_SERVICE_ROLE_KEY` (pour admin dashboard uniquement)

### Étape 2 : Vérifier les Valeurs

Assurez-vous que :
- ✅ Les noms de variables commencent par `VITE_`
- ✅ Il n'y a pas d'espaces dans les noms
- ✅ Il n'y a pas d'espaces avant/après les valeurs
- ✅ Les valeurs sont correctes (copiées depuis Supabase)

### Étape 3 : Redéployer

**IMPORTANT** : Après avoir ajouté ou modifié les variables d'environnement, vous DEVEZ redéployer :

#### Option A : Redéploiement Automatique (Recommandé)

1. Allez dans **Deployments**
2. Trouvez le dernier déploiement
3. Cliquez sur les **3 points** (⋯) à droite
4. Sélectionnez **Retry deployment**

#### Option B : Nouveau Déploiement

1. Allez dans **Deployments**
2. Cliquez sur **Create deployment**
3. Sélectionnez la branche `main` (ou votre branche de production)
4. Cliquez sur **Deploy**

#### Option C : Déclencher un Nouveau Build

1. Faites un petit changement dans votre code (ex: ajouter un commentaire)
2. Committez et poussez sur GitHub
3. Cloudflare Pages va automatiquement builder et déployer avec les nouvelles variables

### Étape 4 : Vérifier les Logs de Build

Après le redéploiement, vérifiez les logs de build :

1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Cliquez sur **View build log**
4. Vérifiez que le build s'est terminé avec succès

### Étape 5 : Vérifier dans l'Application

1. Ouvrez votre application déployée
2. Ouvrez la console du navigateur (F12)
3. Vérifiez les logs :
   - `📍 URL:` devrait afficher votre URL Supabase (pas `placeholder`)
   - `✅ Valid credentials: true`
   - Pas de message "SUPABASE NOT CONFIGURED"

## 🔍 Vérification Avancée

### Vérifier que les Variables sont Disponibles lors du Build

Dans les logs de build Cloudflare Pages, vous pouvez vérifier :

```
Installing project dependencies...
Executing user command: npm run build
```

Les variables d'environnement sont disponibles pendant cette étape. Si elles ne sont pas définies, Vite utilisera les valeurs par défaut.

### Test Local

Pour tester localement avant de déployer :

1. Créez un fichier `.env` dans `client-dashboard/` :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

2. Testez le build localement :
```bash
cd client-dashboard
npm run build
npm run preview
```

3. Vérifiez que les variables sont correctes dans la console

## ⚠️ Points Importants

### 1. Variables pour Tous les Environnements

Les variables doivent être définies pour :
- ✅ **Production** (obligatoire)
- ✅ **Preview** (recommandé)
- ⚠️ **Branch previews** (optionnel)

### 2. Format des Variables

✅ **Correct** :
```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

❌ **Incorrect** :
```
VITE_SUPABASE_URL = https://votre-projet.supabase.co  (espaces autour du =)
VITE_SUPABASE_URL=https://votre-projet.supabase.co/  (slash à la fin)
VITE_SUPABASE_URL = "https://votre-projet.supabase.co"  (guillemets)
```

### 3. Cache du Navigateur

Si vous avez modifié les variables et redéployé, mais que l'application affiche toujours les anciennes valeurs :

1. Videz le cache du navigateur (Ctrl+Shift+Delete)
2. Ou ouvrez en navigation privée
3. Ou forcez le rechargement (Ctrl+F5)

## 📝 Checklist de Résolution

- [ ] Variables d'environnement ajoutées dans Cloudflare Pages
- [ ] Variables définies pour **Production**
- [ ] Noms de variables commencent par `VITE_`
- [ ] Pas d'espaces dans les noms ou valeurs
- [ ] Valeurs correctes (copiées depuis Supabase)
- [ ] Redéploiement effectué après avoir ajouté les variables
- [ ] Build réussi (vérifié dans les logs)
- [ ] Application testée (console du navigateur)
- [ ] Cache du navigateur vidé (si nécessaire)

## 🚀 Solution Rapide

Si vous venez d'ajouter les variables et que l'application ne fonctionne toujours pas :

1. **Deployments** > **Create deployment** > Sélectionnez `main` > **Deploy**
2. Attendez que le build se termine (2-5 minutes)
3. Ouvrez l'application dans un navigateur en navigation privée
4. Vérifiez la console (F12)
5. Les variables devraient maintenant être disponibles

## 📚 Documentation Complémentaire

- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Rappel** : Les variables d'environnement Vite sont intégrées au BUILD. Vous devez redéployer après chaque modification des variables.


# 🔍 Débogage Avancé : Variables d'Environnement Cloudflare Pages

## ❌ Problème Persistant

Même après avoir redéployé, les variables d'environnement ne sont toujours pas disponibles dans l'application.

## 🔍 Vérifications à Effectuer

### 1. Vérifier que les Variables sont Bien Définies

Dans Cloudflare Pages :

1. Allez dans **Settings** > **Environment variables**
2. Vérifiez que vous voyez bien vos variables :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vérifiez que les variables sont définies pour **Production** (pas seulement Preview)

### 2. Vérifier le Format des Variables

**Format Correct** :
```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Formats Incorrects à Éviter** :
```
❌ VITE_SUPABASE_URL = https://... (espaces autour du =)
❌ VITE_SUPABASE_URL="https://..." (guillemets)
❌ VITE_SUPABASE_URL=https://.../ (slash à la fin de l'URL)
❌ vite_supabase_url=https://... (minuscules - doit être en MAJUSCULES)
```

### 3. Vérifier les Logs de Build

Dans Cloudflare Pages :

1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Cliquez sur **View build log**
4. Cherchez les lignes suivantes :
   ```
   Installing project dependencies...
   Executing user command: npm run build
   ```

**Si les variables ne sont pas disponibles pendant le build**, vous verrez des warnings ou des erreurs.

### 4. Vérifier le Root Directory

Le Root Directory peut affecter la façon dont les variables sont passées :

1. Allez dans **Settings** > **Builds & deployments**
2. Vérifiez que **Root directory** est bien configuré :
   - Pour client-dashboard : `client-dashboard` (sans slash)
   - Pour notary-admin : `notary-admin` (sans slash)

### 5. Test avec un Fichier de Build Personnalisé

Créez un script de build qui affiche les variables pour déboguer :

Dans `client-dashboard/package.json`, modifiez le script build :

```json
{
  "scripts": {
    "build": "echo 'VITE_SUPABASE_URL='$VITE_SUPABASE_URL && vite build"
  }
}
```

Cela affichera la valeur de la variable dans les logs de build.

## 🚀 Solutions Alternatives

### Solution 1 : Utiliser un Fichier .env dans le Repository (Non Recommandé pour Production)

⚠️ **ATTENTION** : Cette méthode n'est pas sécurisée pour les clés secrètes, mais peut servir pour tester.

1. Créez un fichier `.env.production` dans `client-dashboard/`
2. Ajoutez vos variables :
   ```
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_anon_key
   ```
3. Committez et poussez (⚠️ seulement pour tester)
4. Redéployez

**⚠️ IMPORTANT** : Ne commitez JAMAIS de vraies clés secrètes dans Git. Utilisez cette méthode uniquement pour tester.

### Solution 2 : Vérifier les Variables avec un Script de Build

Créez un fichier `client-dashboard/scripts/check-env.js` :

```javascript
console.log('🔍 Checking environment variables...');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set');
```

Modifiez `package.json` :
```json
{
  "scripts": {
    "prebuild": "node scripts/check-env.js",
    "build": "vite build"
  }
}
```

### Solution 3 : Utiliser des Variables Publiques dans le Code (Temporaire)

Pour tester si le problème vient des variables d'environnement ou d'autre chose, vous pouvez temporairement hardcoder les valeurs dans le code :

**⚠️ UNIQUEMENT POUR TESTER - NE COMMITEZ JAMAIS CELA**

Dans `client-dashboard/src/lib/supabase.js` :

```javascript
// TEMPORAIRE - POUR TESTER UNIQUEMENT
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://votre-projet.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'votre_anon_key_ici';
```

Si cela fonctionne avec les valeurs hardcodées, le problème vient de la configuration des variables d'environnement dans Cloudflare Pages.

## 🔧 Vérifications Spécifiques Cloudflare Pages

### 1. Vérifier que les Variables sont pour le Bon Projet

Assurez-vous que vous configurez les variables pour le **bon projet** :
- `notary-client-dashboard` pour le client dashboard
- `notary-admin-dashboard` pour l'admin dashboard

### 2. Vérifier l'Environnement

Les variables doivent être définies pour :
- ✅ **Production** (obligatoire)
- ✅ **Preview** (recommandé)

### 3. Vérifier le Nom du Projet

Le nom du projet dans Cloudflare Pages doit correspondre à ce que vous avez configuré.

### 4. Supprimer et Recréer les Variables

Parfois, supprimer et recréer les variables peut résoudre le problème :

1. Allez dans **Settings** > **Environment variables**
2. Supprimez toutes les variables
3. Recréez-les une par une
4. Redéployez

## 🐛 Problèmes Connus

### Problème 1 : Variables avec Espaces

Si vos variables contiennent des espaces (même invisibles), elles ne fonctionneront pas.

**Solution** : Recréez les variables en copiant-collant directement depuis Supabase.

### Problème 2 : Variables pour le Mauvais Environnement

Si vous définissez les variables uniquement pour "Preview" mais que vous testez la version "Production", elles ne seront pas disponibles.

**Solution** : Définissez les variables pour **Production** ET **Preview**.

### Problème 3 : Cache de Build

Cloudflare Pages peut mettre en cache certains éléments du build.

**Solution** : 
1. Allez dans **Settings** > **Builds & deployments**
2. Cliquez sur **Clear build cache**
3. Redéployez

### Problème 4 : Root Directory Incorrect

Si le Root Directory est mal configuré, les variables peuvent ne pas être accessibles.

**Solution** : Vérifiez que le Root Directory est exactement `client-dashboard` (sans slash, sans espaces).

## 📝 Checklist Complète

- [ ] Variables définies dans Cloudflare Pages
- [ ] Variables définies pour **Production**
- [ ] Noms de variables en MAJUSCULES avec préfixe `VITE_`
- [ ] Pas d'espaces dans les noms ou valeurs
- [ ] Pas de guillemets autour des valeurs
- [ ] URL Supabase correcte (sans slash à la fin)
- [ ] Root Directory correctement configuré
- [ ] Build cache vidé
- [ ] Nouveau déploiement effectué après modification des variables
- [ ] Logs de build vérifiés
- [ ] Console du navigateur vérifiée (F12)
- [ ] Cache du navigateur vidé

## 🆘 Si Rien ne Fonctionne

Si après avoir essayé toutes ces solutions, le problème persiste :

1. **Contactez le Support Cloudflare** :
   - Allez sur https://dash.cloudflare.com
   - Ouvrez un ticket de support
   - Fournissez :
     - Le nom de votre projet
     - Les logs de build
     - Une capture d'écran de vos variables d'environnement (masquez les valeurs)

2. **Vérifiez la Documentation Cloudflare** :
   - [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)

3. **Testez avec un Projet Minimal** :
   - Créez un projet Vite minimal
   - Ajoutez une seule variable d'environnement
   - Déployez sur Cloudflare Pages
   - Vérifiez si cela fonctionne

## 🔍 Commandes de Debug

Pour déboguer localement avant de déployer :

```bash
# Vérifier les variables d'environnement
cd client-dashboard
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Build local avec variables
VITE_SUPABASE_URL=https://votre-projet.supabase.co VITE_SUPABASE_ANON_KEY=votre_key npm run build

# Vérifier dans le code compilé
grep -r "placeholder" dist/
```

Si `grep` ne trouve pas "placeholder" dans le `dist/`, les variables sont bien intégrées.

---

**Note** : Les variables d'environnement Vite sont intégrées au BUILD. Si elles ne sont pas disponibles pendant le build, elles ne seront pas dans l'application finale.


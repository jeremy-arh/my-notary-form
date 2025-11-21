# 🔧 Troubleshooting - Variables d'environnement non chargées

## ❌ Problème : "SUPABASE NOT CONFIGURED" malgré la présence du fichier .env

Si vous voyez cette erreur alors que le fichier `.env` existe, voici les causes possibles :

## ✅ Solutions à vérifier

### 1. **Emplacement du fichier .env**
Le fichier `.env` doit être **exactement** dans le dossier `notary-dashboard/` (même niveau que `package.json`)

```
notary-dashboard/
├── .env          ← ICI (pas ailleurs)
├── package.json
├── src/
└── ...
```

### 2. **Format du fichier .env**
Le fichier doit respecter ce format exact (sans espaces autour du `=`):

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_ici
```

❌ **MAUVAIS** (ne fonctionnera pas):
```env
VITE_SUPABASE_URL = https://...  ← Espaces autour du =
VITE_SUPABASE_URL="https://..."  ← Guillemets (optionnel mais peut causer des problèmes)
```

✅ **BON**:
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. **Nom du fichier**
Le fichier doit s'appeler exactement `.env` (pas `.env.txt`, `.env.local`, etc.)

### 4. **Redémarrer le serveur**
**IMPORTANT** : Après avoir créé ou modifié le fichier `.env`, vous DEVEZ :
1. Arrêter le serveur (Ctrl+C)
2. Relancer `npm run dev`

Vite ne recharge pas automatiquement les fichiers `.env` pendant l'exécution.

### 5. **Vérifier le contenu**
Ouvrez le fichier `.env` et vérifiez :
- ✅ Pas d'espaces avant/après les valeurs
- ✅ Pas de caractères invisibles
- ✅ Les valeurs sont sur une seule ligne (pas de retours à la ligne dans les valeurs)
- ✅ Pas de commentaires sur la même ligne que les variables

### 6. **Vérifier dans la console**
Après redémarrage, regardez la console du navigateur. Vous devriez voir :
```
🔍 Raw VITE_SUPABASE_URL: "https://..."
✅ Valid credentials: true
```

Si vous voyez `undefined`, les variables ne sont pas chargées.

## 🔍 Diagnostic

Pour diagnostiquer le problème, ajoutez temporairement ceci dans votre code :

```javascript
console.log('All env vars:', import.meta.env);
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
```

Cela vous montrera toutes les variables d'environnement chargées par Vite.

## 📝 Exemple de fichier .env correct

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.abcdefghijklmnopqrstuvwxyz1234567890
```

## ⚠️ Erreurs courantes

1. **Fichier dans le mauvais dossier** : Le `.env` doit être dans `notary-dashboard/`, pas dans le dossier parent
2. **Serveur non redémarré** : Vite ne recharge pas les `.env` à chaud
3. **Espaces dans le fichier** : `VITE_SUPABASE_URL = ...` ne fonctionne pas
4. **Nom incorrect** : `.env.local` ou `.env.txt` ne seront pas chargés automatiquement
5. **Variables sans préfixe VITE_** : Seules les variables commençant par `VITE_` sont exposées au client

## 🆘 Si rien ne fonctionne

1. Supprimez le fichier `.env`
2. Créez-le à nouveau avec un éditeur de texte simple (pas Word)
3. Copiez-collez exactement le format ci-dessus
4. Redémarrez le serveur
5. Vérifiez la console du navigateur





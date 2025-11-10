# Configuration de l'URL de redirection pour les invitations de notaire

## Problème

Lors de l'invitation d'un notaire, l'URL de redirection doit pointer vers le domaine de production du dashboard notaire, pas vers localhost.

## Solution

### Option 1 : Variable d'environnement (RECOMMANDÉ)

Ajoutez la variable d'environnement suivante dans Cloudflare Pages pour le projet `notary-admin` :

```
VITE_NOTARY_DASHBOARD_URL=https://notary.mynotary.io
```

**Avantages :**
- Configuration centralisée
- Facile à modifier sans changer le code
- Fonctionne même si les domaines ne suivent pas le pattern `admin.` / `notary.`

### Option 2 : Détection automatique (fallback)

Si la variable d'environnement n'est pas définie, le système détecte automatiquement le domaine de production en remplaçant `admin.` par `notary.` dans le hostname actuel.

**Exemple :**
- Si l'admin dashboard est sur `admin.mynotary.io`
- Le système utilisera automatiquement `notary.mynotary.io`

**Limitation :**
- Ne fonctionne que si les domaines suivent le pattern `admin.` / `notary.`
- Si les domaines sont complètement différents, utilisez l'option 1

## Configuration dans Cloudflare Pages

1. Allez dans votre projet Cloudflare Pages pour `notary-admin`
2. Naviguez vers **Settings** → **Environment variables**
3. Ajoutez la variable :
   - **Variable name:** `VITE_NOTARY_DASHBOARD_URL`
   - **Value:** `https://notary.mynotary.io` (remplacez par votre domaine réel)
   - **Environment:** Production (et Preview si nécessaire)

4. **Redeployez** votre application après avoir ajouté la variable

## Vérification

Après avoir configuré la variable et redéployé :

1. Ouvrez la console du navigateur dans le dashboard admin
2. Envoyez une invitation à un notaire
3. Vérifiez les logs dans la console :
   - `🔧 VITE_NOTARY_DASHBOARD_URL:` devrait afficher votre URL
   - `🔗 Redirect URL:` devrait pointer vers `https://notary.mynotary.io/auth/set-password`

## Domaines par défaut

Si vous utilisez les domaines par défaut :
- **Admin dashboard:** `admin.mynotary.io`
- **Notary dashboard:** `notary.mynotary.io`
- **Client dashboard:** `client.mynotary.io` ou `mynotary.io`

## Dépannage

### L'URL pointe toujours vers localhost

1. Vérifiez que la variable d'environnement est bien définie dans Cloudflare Pages
2. Vérifiez que vous avez redéployé après avoir ajouté la variable
3. Vérifiez que la variable commence par `VITE_` (requis pour Vite)
4. Vérifiez les logs dans la console du navigateur pour voir quelle URL est utilisée

### L'URL ne correspond pas à votre domaine

1. Utilisez l'option 1 (variable d'environnement) avec votre domaine exact
2. Assurez-vous que l'URL ne se termine pas par un slash (`/`)
3. L'URL sera automatiquement complétée avec `/auth/set-password`

## Exemple de configuration

```env
# Cloudflare Pages Environment Variables
VITE_NOTARY_DASHBOARD_URL=https://notary.mynotary.io
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```


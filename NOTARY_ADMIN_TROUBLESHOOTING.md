# 🔧 Dépannage Dashboard Admin - Notaires

## ❌ Problèmes Identifiés

### 1. Les notaires ne sont pas récupérés
### 2. L'invitation d'un notaire ne fonctionne pas

## 🔍 Causes Probables

### Problème 1 : Notaires non récupérés

**Causes possibles :**
1. **RLS (Row Level Security) bloque l'accès** - Les politiques RLS peuvent empêcher la lecture de la table `notary`
2. **Service Role Key non configurée** - Sans la service role key, les méthodes `auth.admin.*` échouent silencieusement
3. **Erreur dans la requête** - La requête peut échouer mais l'erreur n'est pas visible

### Problème 2 : Invitation ne fonctionne pas

**Causes possibles :**
1. **Service Role Key manquante** - Les méthodes `auth.admin.inviteUserByEmail()` et `auth.admin.listUsers()` nécessitent la service role key
2. **Email non configuré dans Supabase** - Le service email doit être configuré pour envoyer les invitations
3. **URL de redirection incorrecte** - L'URL de redirection doit pointer vers le bon domaine

## ✅ Solutions

### Solution 1 : Configurer la Service Role Key

**Étape 1 : Récupérer la Service Role Key**

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez la **service_role** key (⚠️ **NE JAMAIS** exposer cette clé publiquement)

**Étape 2 : Ajouter la variable dans Cloudflare Pages**

1. Allez sur https://dash.cloudflare.com
2. Sélectionnez votre projet **notary-admin**
3. Allez dans **Settings** > **Environment variables**
4. Ajoutez la variable :
   - **Name**: `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: `votre_service_role_key_ici`
   - **Environment**: Production, Preview, Branch previews

**Étape 3 : Redéployer**

1. Allez dans **Deployments**
2. Cliquez sur **Create deployment** ou **Retry deployment**
3. Attendez que le build se termine

### Solution 2 : Vérifier les Politiques RLS

**Vérifier les politiques RLS sur la table `notary` :**

```sql
-- Vérifier les politiques RLS
SELECT * FROM pg_policies WHERE tablename = 'notary';

-- Si nécessaire, créer une politique pour le service role
CREATE POLICY "Service role can manage notaries"
ON notary
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

**Note :** Avec la service role key, RLS est automatiquement bypassé, donc cette étape n'est nécessaire que si vous utilisez l'anon key.

### Solution 3 : Configurer le Service Email dans Supabase

**Pour que les invitations fonctionnent :**

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Email Templates**
4. Vérifiez que le template "Invite user" est configuré
5. Allez dans **Settings** > **Auth** > **SMTP Settings**
6. Configurez SMTP (ou utilisez le service par défaut de Supabase)

### Solution 4 : Vérifier les Logs

**Dans le navigateur :**
1. Ouvrez la console du navigateur (F12)
2. Allez sur la page des notaires
3. Cherchez les logs :
   - `🔍 Fetching notaries...`
   - `✅ Found X notaries in database`
   - `❌ Error fetching notaries...`

**Dans Cloudflare Pages :**
1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Cliquez sur **View build log**
4. Cherchez les erreurs liées à Supabase

**Dans Supabase :**
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Logs** > **API Logs**
4. Cherchez les erreurs 401, 403, ou 500

## 🧪 Tests

### Test 1 : Vérifier que les notaires sont dans la base de données

```sql
-- Dans Supabase SQL Editor
SELECT * FROM notary;
```

Si aucun résultat, créez un notaire de test :
```sql
INSERT INTO notary (
  full_name,
  email,
  phone,
  address,
  city,
  postal_code,
  country,
  timezone,
  license_number,
  is_active
) VALUES (
  'Test Notary',
  'test@example.com',
  '+1234567890',
  '123 Test St',
  'Test City',
  '12345',
  'US',
  'America/New_York',
  'TEST123',
  true
);
```

### Test 2 : Vérifier la configuration Supabase

Dans la console du navigateur, vérifiez les logs :
```
🔌 SUPABASE CONFIGURATION (ADMIN DASHBOARD)
🔑 Key Type: SERVICE ROLE (bypass RLS)
✅ Valid credentials: true
```

Si vous voyez `ANON KEY` au lieu de `SERVICE ROLE`, la service role key n'est pas configurée.

### Test 3 : Tester l'invitation

1. Créez un notaire dans le dashboard admin
2. Cliquez sur l'icône d'enveloppe pour envoyer l'invitation
3. Vérifiez la console du navigateur pour les erreurs
4. Vérifiez les logs Supabase pour les erreurs d'email

## 📝 Checklist de Vérification

- [ ] Service Role Key configurée dans Cloudflare Pages
- [ ] Variable `VITE_SUPABASE_SERVICE_ROLE_KEY` définie pour Production, Preview, Branch previews
- [ ] Projet redéployé après ajout de la variable
- [ ] Service email configuré dans Supabase
- [ ] Template d'invitation configuré dans Supabase
- [ ] Politiques RLS vérifiées (ou service role key utilisée)
- [ ] Notaires existent dans la base de données
- [ ] Logs du navigateur vérifiés
- [ ] Logs Supabase vérifiés

## 🚨 Erreurs Communes

### Erreur : "Service Role Key not configured"
**Solution :** Ajoutez `VITE_SUPABASE_SERVICE_ROLE_KEY` dans Cloudflare Pages et redéployez.

### Erreur : "Failed to send invitation: Invalid API key"
**Solution :** Vérifiez que la service role key est correcte et qu'elle commence par `eyJ...`.

### Erreur : "Error loading notaries: permission denied"
**Solution :** Vérifiez les politiques RLS ou utilisez la service role key pour bypass RLS.

### Erreur : "No notaries found" mais des notaires existent dans la base
**Solution :** 
1. Vérifiez les politiques RLS
2. Vérifiez que la service role key est utilisée
3. Vérifiez les logs du navigateur pour les erreurs exactes

## 📞 Support

Si le problème persiste :
1. Vérifiez les logs du navigateur (F12 > Console)
2. Vérifiez les logs Supabase (Dashboard > Logs > API Logs)
3. Vérifiez les logs Cloudflare Pages (Deployments > View build log)
4. Partagez les erreurs exactes pour un diagnostic plus précis


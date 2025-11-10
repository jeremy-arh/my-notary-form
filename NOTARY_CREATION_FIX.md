# 🔧 Fix: Création de Notaire sur Dashboard Admin

## ❌ Problème

La création d'un notaire ne fonctionne pas sur le dashboard admin. Plusieurs causes possibles :

1. **RLS (Row Level Security) bloque l'insertion**
2. **Service Role Key non configurée**
3. **Colonnes manquantes dans la base de données**
4. **Permissions insuffisantes**

## ✅ Solutions Appliquées

### 1. Amélioration de la Gestion des Erreurs

- ✅ Logs détaillés pour diagnostiquer les problèmes
- ✅ Messages d'erreur clairs et actionnables
- ✅ Validation de l'email avant insertion
- ✅ Gestion des erreurs spécifiques (contraintes uniques, permissions, colonnes manquantes)

### 2. Amélioration du Code de Création

- ✅ Conversion des champs vides en `null` (au lieu de chaînes vides)
- ✅ Gestion des services optionnels (ne bloque pas la création si aucun service n'est sélectionné)
- ✅ Vérification de l'existence des services avant suppression (pour éviter les erreurs)

## 🔍 Diagnostic

### Étape 1 : Vérifier les Logs du Navigateur

1. Ouvrez la console du navigateur (F12)
2. Allez sur la page des notaires dans le dashboard admin
3. Cliquez sur "Create Notary"
4. Remplissez le formulaire et cliquez sur "Create"
5. Regardez les logs dans la console :
   - `💾 Saving notary...`
   - `📤 Insert data: {...}`
   - `❌ Insert error: {...}` (si erreur)

### Étape 2 : Vérifier la Service Role Key

**Dans la console du navigateur**, vous devriez voir :
```
🔌 SUPABASE CONFIGURATION (ADMIN DASHBOARD)
🔑 Key Type: SERVICE ROLE (bypass RLS)
✅ Valid credentials: true
```

Si vous voyez `ANON KEY` au lieu de `SERVICE ROLE`, la service role key n'est pas configurée.

**Solution :**
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez la **service_role** key
5. Allez sur https://dash.cloudflare.com
6. Sélectionnez votre projet **notary-admin**
7. Allez dans **Settings** > **Environment variables**
8. Ajoutez `VITE_SUPABASE_SERVICE_ROLE_KEY` avec la valeur copiée
9. **Redéployez** le projet

### Étape 3 : Vérifier les Politiques RLS

**Dans Supabase SQL Editor**, exécutez :

```sql
-- Vérifier les politiques RLS sur la table notary
SELECT * FROM pg_policies WHERE tablename = 'notary';
```

**Si aucune politique n'autorise l'insertion pour les admins**, créez une politique :

```sql
-- Politique pour permettre aux admins de gérer les notaires
CREATE POLICY "Admins can manage notaries"
ON notary
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_user
    WHERE admin_user.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_user
    WHERE admin_user.user_id = auth.uid()
  )
);
```

**OU**, si vous utilisez la service role key, vous pouvez désactiver RLS pour les opérations admin :

```sql
-- Désactiver RLS pour la table notary (si vous utilisez service role key)
ALTER TABLE notary DISABLE ROW LEVEL SECURITY;
```

**⚠️ Note :** Désactiver RLS n'est recommandé que si vous utilisez la service role key, qui bypass RLS automatiquement.

### Étape 4 : Vérifier le Schéma de la Base de Données

**Vérifiez que toutes les colonnes existent :**

```sql
-- Vérifier les colonnes de la table notary
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notary'
ORDER BY ordinal_position;
```

**Colonnes requises :**
- `id` (UUID, PRIMARY KEY)
- `name` (VARCHAR)
- `full_name` (VARCHAR)
- `email` (VARCHAR, UNIQUE)
- `phone` (VARCHAR, nullable)
- `address` (TEXT, nullable)
- `city` (VARCHAR, nullable)
- `postal_code` (VARCHAR, nullable)
- `country` (VARCHAR, nullable)
- `timezone` (VARCHAR, nullable)
- `license_number` (VARCHAR, nullable)
- `bio` (TEXT, nullable)
- `iban` (VARCHAR, nullable)
- `bic` (VARCHAR, nullable)
- `bank_name` (VARCHAR, nullable)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `user_id` (UUID, nullable, FOREIGN KEY to auth.users)

**Si des colonnes manquent**, exécutez les migrations :

```sql
-- Migration pour ajouter les colonnes manquantes
ALTER TABLE notary ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE notary ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE notary ADD COLUMN IF NOT EXISTS iban VARCHAR(34);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS bic VARCHAR(11);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE notary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## 🧪 Test de Création

### Test 1 : Créer un Notaire Simple

1. Allez sur le dashboard admin
2. Cliquez sur "Notaries" dans le menu
3. Cliquez sur "+ Create Notary"
4. Remplissez :
   - **Full Name** : Test Notary
   - **Email** : test@example.com
   - **Address** : 123 Test St
5. Cliquez sur "Create"
6. Vérifiez les logs dans la console
7. Vérifiez que le notaire apparaît dans la liste

### Test 2 : Vérifier les Erreurs

Si une erreur se produit :
1. Ouvrez la console du navigateur (F12)
2. Cherchez les logs avec `❌`
3. Copiez le message d'erreur complet
4. Vérifiez le code d'erreur :
   - `23505` = Contrainte unique violée (email déjà existant)
   - `42501` = Permission refusée (RLS bloque)
   - `PGRST116` = Enregistrement non trouvé
   - `42P01` = Table n'existe pas
   - `42703` = Colonne n'existe pas

## 📝 Erreurs Courantes et Solutions

### Erreur : "Permission denied" ou "policy"

**Cause :** RLS bloque l'insertion

**Solution :**
1. Vérifiez que la service role key est configurée
2. Vérifiez les politiques RLS dans Supabase
3. Créez une politique pour permettre aux admins de gérer les notaires
4. Ou désactivez RLS si vous utilisez la service role key

### Erreur : "column does not exist"

**Cause :** Colonnes manquantes dans la base de données

**Solution :**
1. Exécutez les migrations SQL pour ajouter les colonnes manquantes
2. Vérifiez que toutes les colonnes existent avec la requête SQL ci-dessus

### Erreur : "duplicate key value violates unique constraint"

**Cause :** Un notaire avec cet email existe déjà

**Solution :**
1. Utilisez un email différent
2. Ou modifiez le notaire existant au lieu d'en créer un nouveau

### Erreur : "Service Role Key not configured"

**Cause :** La service role key n'est pas configurée dans Cloudflare Pages

**Solution :**
1. Ajoutez `VITE_SUPABASE_SERVICE_ROLE_KEY` dans Cloudflare Pages
2. Redéployez le projet
3. Vérifiez les logs pour confirmer que la service role key est utilisée

## 🔍 Vérification dans Supabase

### Vérifier que le Notaire a été Créé

```sql
-- Vérifier les notaires dans la base de données
SELECT id, full_name, email, created_at, is_active
FROM notary
ORDER BY created_at DESC
LIMIT 10;
```

### Vérifier les Services Assignés

```sql
-- Vérifier les services assignés à un notaire
SELECT n.full_name, s.name, ns.created_at
FROM notary n
JOIN notary_services ns ON ns.notary_id = n.id
JOIN services s ON s.id = ns.service_id
WHERE n.email = 'test@example.com';
```

## 📞 Support

Si le problème persiste après avoir suivi ces étapes :

1. **Vérifiez les logs du navigateur** (F12 > Console)
2. **Vérifiez les logs Supabase** (Dashboard > Logs > API Logs)
3. **Vérifiez les logs Cloudflare Pages** (Deployments > View build log)
4. **Partagez les erreurs exactes** pour un diagnostic plus précis

## ✅ Checklist de Vérification

- [ ] Service Role Key configurée dans Cloudflare Pages
- [ ] Variable `VITE_SUPABASE_SERVICE_ROLE_KEY` définie pour Production, Preview, Branch previews
- [ ] Projet redéployé après ajout de la variable
- [ ] Politiques RLS vérifiées (ou RLS désactivé si service role key utilisée)
- [ ] Toutes les colonnes existent dans la table `notary`
- [ ] Table `notary_services` existe
- [ ] Logs du navigateur vérifiés
- [ ] Logs Supabase vérifiés
- [ ] Test de création effectué

---

**Note :** Les corrections ont été appliquées et poussées sur la branche `main`. Redéployez le projet dans Cloudflare Pages pour que les changements prennent effet.


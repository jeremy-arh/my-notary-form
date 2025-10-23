# 🚨 CONFIGURATION SUPABASE REQUISE

Pour que le formulaire fonctionne correctement, vous DEVEZ exécuter les scripts SQL suivants dans votre base de données Supabase.

## ⚠️ Erreurs actuelles sans ces scripts

Sans ces scripts, vous obtiendrez les erreurs suivantes :
- ❌ `infinite recursion detected in policy for relation "admin_user"`
- ❌ `Could not find the 'address' column of 'client' in the schema cache`
- ❌ `new row violates row-level security policy for table "client"`

---

## 📋 SCRIPTS À EXÉCUTER (DANS L'ORDRE)

### 1️⃣ Script 1 : Ajouter les colonnes d'adresse à la table client

**Fichier:** `supabase-client-address-fix.sql`

```sql
-- Add address columns to client table
ALTER TABLE client ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS country TEXT;
```

**Ce que ce script fait:**
- Ajoute les colonnes `address`, `city`, `postal_code`, `country` à la table `client`
- Ces colonnes sont nécessaires pour sauvegarder les informations d'adresse du client

---

### 2️⃣ Script 2 : Corriger les politiques RLS avec récursion infinie

**Fichier:** `supabase-rls-fix.sql`

```sql
-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can read admin data" ON admin_user;
DROP POLICY IF EXISTS "Super admins can create admins" ON admin_user;
DROP POLICY IF EXISTS "Admins can read all client data" ON client;
DROP POLICY IF EXISTS "Admins can read all messages" ON message;
DROP POLICY IF EXISTS "Admins can send messages" ON message;

-- Create helper functions with SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_user
    WHERE user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_user
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Recreate policies using helper functions
CREATE POLICY "Admins can read admin data"
  ON admin_user FOR SELECT
  USING (is_admin());

CREATE POLICY "Super admins can create admins"
  ON admin_user FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Admins can read all client data"
  ON client FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can read all messages"
  ON message FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can send messages"
  ON message FOR INSERT
  WITH CHECK (
    is_admin() AND
    sender_type = 'admin' AND
    EXISTS (SELECT 1 FROM admin_user a WHERE a.id = sender_id AND a.user_id = auth.uid())
  );
```

**Ce que ce script fait:**
- Crée des fonctions helper `is_admin()` et `is_super_admin()` avec SECURITY DEFINER
- Ces fonctions contournent les RLS pour éviter la récursion infinie
- Recrée toutes les politiques admin en utilisant ces fonctions

---

### 3️⃣ Script 3 : Permettre la création de comptes clients

**Fichier:** `supabase-client-insert-fix.sql`

```sql
-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Anyone can create client account" ON client;
DROP POLICY IF EXISTS "Allow client creation" ON client;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON client;

-- Create policy that allows client account creation
CREATE POLICY "Anyone can create client account"
  ON client FOR INSERT
  TO public
  WITH CHECK (true);
```

**Ce que ce script fait:**
- Supprime les anciennes politiques d'insertion qui pourraient causer des conflits
- Crée une nouvelle politique qui permet à n'importe qui d'insérer dans la table `client`
- Cette politique est nécessaire car après `signUp()`, l'utilisateur n'est pas encore authentifié

---

## 🔧 COMMENT EXÉCUTER CES SCRIPTS

1. **Ouvrez votre projet Supabase**
   - URL: https://supabase.com/dashboard/project/jlizwheftlnhoifbqeex

2. **Allez dans SQL Editor**
   - Menu latéral gauche → SQL Editor

3. **Pour chaque script ci-dessus:**
   - Cliquez sur "New query"
   - Copiez-collez le contenu du script
   - Cliquez sur "Run" ▶️
   - Vérifiez qu'il n'y a pas d'erreur

4. **Ordre d'exécution:** Exécutez les scripts dans l'ordre (1, 2, 3)

---

## ✅ VÉRIFICATION

Après avoir exécuté tous les scripts, vous pouvez vérifier que tout fonctionne :

### Vérifier les colonnes de la table client :
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'client'
ORDER BY ordinal_position;
```

### Vérifier les fonctions helper :
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('is_admin', 'is_super_admin')
AND routine_schema = 'public';
```

### Vérifier les politiques RLS :
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('client', 'admin_user', 'message')
ORDER BY tablename, cmd, policyname;
```

---

## 🎯 RÉSULTAT ATTENDU

Après avoir exécuté tous les scripts :
- ✅ Le formulaire peut créer des comptes clients
- ✅ Les adresses sont sauvegardées correctement
- ✅ Plus d'erreur de récursion infinie
- ✅ Les admins peuvent accéder aux données
- ✅ La messagerie fonctionne correctement

---

## 🆘 EN CAS DE PROBLÈME

Si vous rencontrez des erreurs lors de l'exécution des scripts :

1. **Erreur "policy already exists"**
   - Utilisez `DROP POLICY IF EXISTS` avant de créer la politique
   - Ou ignorez l'erreur si la politique existe déjà

2. **Erreur "column already exists"**
   - Utilisez `ADD COLUMN IF NOT EXISTS`
   - Ou ignorez l'erreur si la colonne existe déjà

3. **Erreur "function already exists"**
   - Utilisez `CREATE OR REPLACE FUNCTION`
   - Le script utilise déjà cette syntaxe

4. **Autres erreurs**
   - Vérifiez que vous avez les permissions nécessaires
   - Contactez le support si le problème persiste

---

## 📝 ALTERNATIVE : MIGRATION COMPLÈTE

Si vous préférez tout réinitialiser et repartir de zéro, vous pouvez exécuter le fichier de migration complet :

**Fichier:** `supabase-messaging-migration.sql`

⚠️ **Attention:** Ce script créera toutes les tables et politiques. Si elles existent déjà, certaines commandes échoueront mais c'est normal.

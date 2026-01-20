# Fix : Emails envoyés mais pas dans email_sent

## 🔍 Diagnostic

Vous avez reçu `sent: 31` mais aucune donnée dans `email_sent`. Cela signifie que :
- ✅ Les emails ont été envoyés via SendGrid
- ❌ L'insertion dans `email_sent` a échoué silencieusement

## 🔧 Vérifications à faire

### 1. Vérifier les logs de send-transactional-email

1. Allez dans **Supabase Dashboard** > **Edge Functions** > **send-transactional-email** > **Logs**
2. Cherchez les lignes avec `Error logging email to email_sent:`
3. Copiez l'erreur exacte

### 2. Vérifier les permissions RLS

```sql
-- Vérifier les politiques RLS
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'email_sent';

-- Vérifier que service_role peut insérer
-- La politique doit contenir : USING (auth.role() = 'service_role')
```

### 3. Tester l'insertion manuelle

```sql
-- Tester l'insertion avec service_role (depuis SQL Editor Supabase)
-- Note: Le SQL Editor utilise service_role par défaut

INSERT INTO email_sent (
  email,
  recipient_name,
  recipient_type,
  email_type,
  subject,
  submission_id
) VALUES (
  'test@example.com',
  'Test User',
  'client',
  'abandoned_cart_h+1',
  'Test Subject',
  NULL
);

-- Vérifier
SELECT * FROM email_sent WHERE email = 'test@example.com';

-- Nettoyer
DELETE FROM email_sent WHERE email = 'test@example.com';
```

Si cette insertion échoue, il y a un problème de permissions ou de structure.

### 4. Vérifier la structure de la table

```sql
-- Vérifier que la table existe et a la bonne structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'email_sent'
ORDER BY ordinal_position;
```

### 5. Vérifier que les migrations ont été exécutées

```sql
-- Vérifier que la migration a été exécutée
SELECT 
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%email_sent%'
ORDER BY executed_at DESC;
```

## 🐛 Causes courantes et solutions

### Cause 1 : Permissions RLS incorrectes

**Symptôme** : Erreur `permission denied for table email_sent`

**Solution** :
```sql
-- Vérifier et recréer la politique RLS
DROP POLICY IF EXISTS "Service role can manage all email sent" ON email_sent;

CREATE POLICY "Service role can manage all email sent"
  ON email_sent
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Cause 2 : Table n'existe pas

**Symptôme** : Erreur `relation "email_sent" does not exist`

**Solution** : Exécuter la migration `20250120_create_email_sent_table.sql`

### Cause 3 : Colonne manquante ou type incorrect

**Symptôme** : Erreur `column "xxx" does not exist` ou `column "xxx" is of type xxx but expression is of type yyy`

**Solution** : Vérifier que la structure de la table correspond au code dans `send-transactional-email/index.ts`

### Cause 4 : Contrainte de clé étrangère

**Symptôme** : Erreur `insert or update on table "email_sent" violates foreign key constraint`

**Solution** : Vérifier que les `submission_id` et `client_id` référencés existent, ou utiliser `NULL` si non disponibles

## 🔧 Solution rapide : Forcer la réinsertion

Si vous voulez réinsérer les emails manquants, vous pouvez créer une fonction de récupération :

```sql
-- Note: Cette fonction nécessite les sg_message_id des emails envoyés
-- qui ne sont pas disponibles après coup si l'insertion a échoué

-- Solution alternative : Vérifier les logs SendGrid pour récupérer les message IDs
-- puis insérer manuellement dans email_sent
```

## ✅ Vérification finale

Après avoir corrigé le problème :

1. **Appelez à nouveau la fonction via Postman**
2. **Vérifiez immédiatement dans email_sent** :
```sql
SELECT 
  id,
  email,
  email_type,
  subject,
  sent_at,
  submission_id,
  sg_message_id
FROM email_sent
WHERE email_type LIKE 'abandoned_cart_%'
ORDER BY sent_at DESC
LIMIT 10;
```

3. **Vérifiez les logs** pour confirmer qu'il n'y a plus d'erreurs

## 📝 Requête de diagnostic complète

```sql
-- Diagnostic complet en une requête
SELECT 
  'Tables existent' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sent')
    THEN '✓ email_sent existe'
    ELSE '✗ email_sent manquante'
  END as status
UNION ALL
SELECT 
  'Politique RLS',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'email_sent' 
        AND policyname = 'Service role can manage all email sent'
    )
    THEN '✓ Politique existe'
    ELSE '✗ Politique manquante'
  END
UNION ALL
SELECT 
  'Emails dans table',
  format('✓ %s emails dans email_sent', COUNT(*))
FROM email_sent
WHERE email_type LIKE 'abandoned_cart_%';
```

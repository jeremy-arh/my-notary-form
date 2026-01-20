# Vérifier pourquoi email_sent n'est pas rempli

## 🔍 Étapes de diagnostic

### 1. Vérifier les logs de send-transactional-email

Les logs que vous avez montrés sont de `send-abandoned-cart-emails`. Il faut maintenant vérifier les logs de `send-transactional-email` qui est appelée en interne.

1. Allez dans **Supabase Dashboard** > **Edge Functions** > **send-transactional-email** > **Logs**
2. Cherchez les lignes autour de l'heure où vous avez appelé la fonction (16:07:55)
3. Cherchez spécifiquement :
   - `Error logging email to email_sent:` → Erreur d'insertion
   - `Email sent successfully to: jeremy+testmail@trybbu.com` → Email envoyé mais insertion peut avoir échoué

### 2. Vérifier que la table existe et est accessible

```sql
-- Vérifier que la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'email_sent';

-- Vérifier la structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_sent'
ORDER BY ordinal_position;
```

### 3. Tester l'insertion manuelle

```sql
-- Tester l'insertion exactement comme le fait la fonction
INSERT INTO email_sent (
  email,
  recipient_name,
  recipient_type,
  email_type,
  subject,
  submission_id,
  client_id,
  sg_message_id
) VALUES (
  'jeremy+testmail@trybbu.com',
  'Client',
  'client',
  'abandoned_cart_h+1',
  'Vous avez oublié quelque chose...',
  NULL, -- Remplacez par un submission_id réel si disponible
  NULL,
  NULL
);

-- Vérifier
SELECT * FROM email_sent WHERE email = 'jeremy+testmail@trybbu.com';
```

### 4. Vérifier les permissions RLS

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

-- La politique doit permettre à service_role d'insérer
-- Si elle n'existe pas ou est incorrecte, recréez-la :
```

```sql
-- Recréer la politique RLS si nécessaire
DROP POLICY IF EXISTS "Service role can manage all email sent" ON email_sent;

CREATE POLICY "Service role can manage all email sent"
  ON email_sent
  FOR ALL
  USING (auth.role() = 'service_role');
```

### 5. Vérifier les variables d'environnement

Dans la fonction `send-transactional-email`, vérifiez que :
- `SUPABASE_URL` est définie
- `SUPABASE_SERVICE_ROLE_KEY` est définie

Allez dans **Supabase Dashboard** > **Edge Functions** > **send-transactional-email** > **Settings** > **Secrets**

### 6. Vérifier les contraintes de clé étrangère

Si `submission_id` ou `client_id` sont fournis mais n'existent pas, l'insertion peut échouer :

```sql
-- Vérifier si les submissions existent
SELECT id, email 
FROM submission 
WHERE email = 'jeremy+testmail@trybbu.com'
LIMIT 5;
```

## 🐛 Causes probables

### Cause 1 : Permissions RLS
**Symptôme** : Erreur `permission denied for table email_sent` dans les logs
**Solution** : Recréer la politique RLS (voir étape 4)

### Cause 2 : Table n'existe pas
**Symptôme** : Erreur `relation "email_sent" does not exist`
**Solution** : Exécuter la migration `20250120_create_email_sent_table.sql`

### Cause 3 : Variables d'environnement manquantes
**Symptôme** : Erreur lors de la création du client Supabase dans la fonction
**Solution** : Vérifier les secrets de l'Edge Function

### Cause 4 : Contrainte de clé étrangère
**Symptôme** : Erreur `violates foreign key constraint`
**Solution** : Vérifier que les `submission_id` et `client_id` existent ou utiliser `NULL`

## ✅ Solution rapide

Si vous voulez forcer l'insertion pour tester, vous pouvez modifier temporairement la fonction `send-transactional-email` pour logger plus d'informations :

```typescript
// Dans send-transactional-email/index.ts, ligne ~171
if (insertError) {
  console.error('Error logging email to email_sent:', insertError)
  console.error('Insert data:', {
    email: emailRequest.recipient_email,
    email_type: emailRequest.email_type,
    submission_id: emailRequest.data?.submission_id,
    client_id: clientId,
  })
  // Don't fail the email send if logging fails
}
```

Puis redéployez la fonction et relancez l'appel.

## 📝 Requête de vérification complète

```sql
-- Vérification complète en une requête
SELECT 
  'Table existe' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sent')
    THEN '✓'
    ELSE '✗ Table manquante - Exécutez la migration'
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
    THEN '✓'
    ELSE '✗ Politique manquante - Recréez la politique'
  END
UNION ALL
SELECT 
  'Emails dans table',
  format('✓ %s emails', COUNT(*))
FROM email_sent
WHERE email_type LIKE 'abandoned_cart_%';
```

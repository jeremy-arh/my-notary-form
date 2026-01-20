# Débogage : Pourquoi aucune donnée dans email_sent et email_events ?

## 🔍 Vérifications à faire

### 1. Vérifier que les tables existent

```sql
-- Vérifier que les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('email_sent', 'email_events');
```

Si les tables n'existent pas, exécutez les migrations :
```sql
-- Exécuter les migrations dans l'ordre
-- 1. email_sent
-- 2. email_events
```

### 2. Vérifier la réponse de la fonction

Quand vous appelez `send-abandoned-cart-emails` via Postman, vérifiez la réponse :

**Réponse normale (aucune submission à traiter)** :
```json
{
  "success": true,
  "results": {
    "processed": 0,
    "sent": 0,
    "errors": []
  },
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

**Réponse avec erreurs** :
```json
{
  "success": true,
  "results": {
    "processed": 0,
    "sent": 0,
    "errors": [
      "Error fetching submissions for h+1: ..."
    ]
  }
}
```

### 3. Vérifier qu'il existe des submissions à traiter

```sql
-- Vérifier les submissions avec status pending_payment
SELECT 
  id,
  email,
  first_name,
  last_name,
  status,
  created_at,
  NOW() - created_at as time_elapsed,
  CASE 
    WHEN NOW() - created_at >= INTERVAL '1 hour' THEN 'h+1 ✓'
    ELSE 'h+1 ✗'
  END as can_send_h_plus_1
FROM submission
WHERE status = 'pending_payment'
  AND email IS NOT NULL
ORDER BY created_at DESC;
```

**Si aucune submission n'apparaît** :
- Aucune submission avec `status = 'pending_payment'`
- Ou aucune submission avec un email valide
- Ou toutes les submissions sont trop récentes (moins d'1 heure)

### 4. Vérifier les logs de la fonction Edge Function

1. Allez dans **Supabase Dashboard** > **Edge Functions** > **send-abandoned-cart-emails** > **Logs**
2. Cherchez les messages :
   - `📧 Found X submissions for h+1` → Des submissions ont été trouvées
   - `⏭️ Submission X already received h+1, skipping` → L'email a déjà été envoyé
   - `✅ Sent h+1 email to ...` → Email envoyé avec succès
   - `❌ Error sending email for submission X` → Erreur lors de l'envoi

### 5. Vérifier les logs de send-transactional-email

1. Allez dans **Supabase Dashboard** > **Edge Functions** > **send-transactional-email** > **Logs**
2. Cherchez :
   - `Email sent successfully to: ...` → Email envoyé
   - `Error logging email to email_sent: ...` → Erreur lors de l'insertion dans `email_sent`
   - `SendGrid error: ...` → Erreur SendGrid

### 6. Vérifier les permissions RLS (Row Level Security)

```sql
-- Vérifier les politiques RLS sur email_sent
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'email_sent';
```

**Important** : La politique doit permettre à `service_role` d'insérer des données.

### 7. Tester manuellement l'insertion dans email_sent

```sql
-- Tester l'insertion manuelle (avec service_role)
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

-- Vérifier l'insertion
SELECT * FROM email_sent WHERE email = 'test@example.com';

-- Nettoyer le test
DELETE FROM email_sent WHERE email = 'test@example.com';
```

Si cette insertion échoue, il y a un problème de permissions ou de structure de table.

### 8. Vérifier que SendGrid répond correctement

Dans les logs de `send-transactional-email`, cherchez :
- `SendGrid error: ...` → Problème avec SendGrid API
- `x-message-id` dans les headers de réponse → SendGrid a accepté l'email

### 9. Forcer l'envoi d'un email pour tester

```sql
-- 1. Créer/modifier une submission pour qu'elle soit éligible
UPDATE submission 
SET 
  status = 'pending_payment',
  created_at = NOW() - INTERVAL '2 hours',
  email = 'votre-email@example.com'
WHERE id = 'VOTRE_SUBMISSION_ID';

-- 2. Vérifier qu'elle est éligible
SELECT 
  id,
  email,
  status,
  created_at,
  NOW() - created_at as time_elapsed
FROM submission
WHERE id = 'VOTRE_SUBMISSION_ID';

-- 3. Appeler la fonction via Postman
-- 4. Vérifier dans email_sent
SELECT * FROM email_sent 
WHERE submission_id = 'VOTRE_SUBMISSION_ID'
ORDER BY sent_at DESC;
```

## 🐛 Causes courantes

### Cause 1 : Aucune submission éligible
**Symptôme** : `processed: 0, sent: 0` dans la réponse
**Solution** : Créer/modifier une submission avec `status = 'pending_payment'` et `created_at` assez ancien

### Cause 2 : Erreur silencieuse dans send-transactional-email
**Symptôme** : Logs montrent `Error logging email to email_sent: ...`
**Solution** : Vérifier les logs et corriger l'erreur (permissions, structure de table, etc.)

### Cause 3 : Tables non créées
**Symptôme** : Erreur "relation email_sent does not exist"
**Solution** : Exécuter les migrations `20250120_create_email_sent_table.sql` et `20250120_create_email_events_table.sql`

### Cause 4 : Permissions RLS
**Symptôme** : Erreur "permission denied for table email_sent"
**Solution** : Vérifier que la politique RLS permet à `service_role` d'insérer

### Cause 5 : SendGrid API Key invalide
**Symptôme** : `SendGrid error: 401` ou `403`
**Solution** : Vérifier que `SENDGRID_API_KEY` est correctement configurée dans les variables d'environnement de l'Edge Function

## ✅ Checklist de débogage

- [ ] Les tables `email_sent` et `email_events` existent
- [ ] Il existe au moins une submission avec `status = 'pending_payment'` et un email valide
- [ ] La submission a été créée il y a assez longtemps (≥ 1 heure pour h+1)
- [ ] La fonction `send-abandoned-cart-emails` retourne `sent > 0` dans les résultats
- [ ] Les logs de `send-transactional-email` montrent `Email sent successfully`
- [ ] Les logs de `send-transactional-email` ne montrent pas d'erreur lors de l'insertion dans `email_sent`
- [ ] Les politiques RLS permettent l'insertion par `service_role`
- [ ] SendGrid API Key est correctement configurée

## 📝 Requête SQL pour vérifier tout en une fois

```sql
-- Vérification complète
SELECT 
  'Tables existent' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sent') 
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_events')
    THEN '✓ OK'
    ELSE '✗ Tables manquantes'
  END as status
UNION ALL
SELECT 
  'Submissions éligibles',
  CASE 
    WHEN COUNT(*) > 0 THEN format('✓ %s submissions trouvées', COUNT(*))
    ELSE '✗ Aucune submission éligible'
  END
FROM submission
WHERE status = 'pending_payment'
  AND email IS NOT NULL
  AND created_at < NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
  'Emails déjà envoyés',
  format('✓ %s emails dans email_sent', COUNT(*))
FROM email_sent
WHERE email_type LIKE 'abandoned_cart_%';
```

# Appeler la Séquence de Relance via Postman

## 📧 Fonction Edge Function : `send-abandoned-cart-emails`

Cette fonction vérifie automatiquement toutes les submissions avec `status = 'pending_payment'` et envoie les emails de relance selon le timing.

## 🔧 Configuration Postman

### 1. Méthode et URL

- **Méthode** : `POST`
- **URL** : `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-abandoned-cart-emails`

Remplacez `YOUR_PROJECT_REF` par votre référence de projet Supabase (trouvable dans Supabase Dashboard > Project Settings > General > Reference ID).

### 2. Headers

Ajoutez les headers suivants :

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer YOUR_SERVICE_ROLE_KEY` |
| `apikey` | `YOUR_SERVICE_ROLE_KEY` |

Remplacez `YOUR_SERVICE_ROLE_KEY` par votre clé de service role (trouvable dans Supabase Dashboard > Project Settings > API > service_role key).

### 3. Body

Le body peut être vide `{}` car la fonction ne nécessite pas de paramètres :

```json
{}
```

## 📝 Exemple complet Postman

### Configuration

```
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-abandoned-cart-emails

Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  apikey: YOUR_SERVICE_ROLE_KEY

Body (raw JSON):
{}
```

### Réponse attendue

```json
{
  "success": true,
  "results": {
    "processed": 5,
    "sent": 3,
    "errors": []
  },
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

## 🎯 Pour tester une submission spécifique

Si vous voulez tester une submission spécifique, vous devez d'abord modifier sa date de création pour déclencher une séquence :

### 1. Modifier la date de création (via SQL Editor Supabase)

```sql
-- Mettre la date à il y a 2 heures pour déclencher h+1
UPDATE submission 
SET created_at = NOW() - INTERVAL '2 hours'
WHERE id = 'VOTRE_SUBMISSION_ID'
  AND status = 'pending_payment';
```

### 2. Appeler la fonction via Postman

Utilisez la configuration ci-dessus. La fonction trouvera automatiquement cette submission et enverra l'email h+1.

### 3. Vérifier l'email envoyé

```sql
-- Vérifier que l'email a été envoyé
SELECT 
  id,
  email_type,
  subject,
  sent_at,
  delivered_at,
  opened_at
FROM email_sent
WHERE submission_id = 'VOTRE_SUBMISSION_ID'
  AND email_type = 'abandoned_cart_h+1'
ORDER BY sent_at DESC;
```

## 🔍 Vérifier les résultats

### Voir toutes les submissions qui devraient recevoir un email

```sql
SELECT 
  s.id,
  s.email,
  s.first_name,
  s.last_name,
  s.created_at,
  NOW() - s.created_at as time_elapsed,
  CASE 
    WHEN NOW() - s.created_at >= INTERVAL '1 hour' THEN 'h+1 ✓'
    ELSE 'h+1 ✗'
  END as h_plus_1,
  CASE 
    WHEN NOW() - s.created_at >= INTERVAL '24 hours' THEN 'j+1 ✓'
    ELSE 'j+1 ✗'
  END as j_plus_1,
  CASE 
    WHEN es.id IS NOT NULL THEN 'Déjà envoyé ✓'
    ELSE 'À envoyer ✗'
  END as email_status
FROM submission s
LEFT JOIN email_sent es ON es.submission_id = s.id 
  AND es.email_type = 'abandoned_cart_h+1'
WHERE s.status = 'pending_payment'
  AND s.email IS NOT NULL
ORDER BY s.created_at ASC;
```

### Voir les emails envoyés récemment

```sql
SELECT 
  id,
  email,
  email_type,
  subject,
  sent_at,
  delivered_at,
  opened_at,
  clicked_at,
  submission_id
FROM email_sent
WHERE email_type LIKE 'abandoned_cart_%'
ORDER BY sent_at DESC
LIMIT 20;
```

## ⚠️ Notes importantes

1. **La fonction traite toutes les submissions** : Elle vérifie toutes les submissions avec `status = 'pending_payment'` et envoie les emails selon le timing.

2. **Timing des séquences** :
   - `h+1` : 1 heure après la création
   - `j+1` : 24 heures après la création
   - `j+3` : 72 heures après la création
   - `j+7` : 168 heures après la création
   - `j+10` : 240 heures après la création
   - `j+15` : 360 heures après la création
   - `j+30` : 720 heures après la création

3. **La fonction ne renvoie pas d'erreur si aucun email n'est à envoyer** : Elle retourne simplement `processed: 0` et `sent: 0`.

4. **Les emails sont envoyés via SendGrid** : Vérifiez les logs SendGrid pour plus de détails sur la livraison.

## 🐛 Dépannage

### Erreur 401 Unauthorized
- Vérifiez que votre `SERVICE_ROLE_KEY` est correcte
- Vérifiez que les headers `Authorization` et `apikey` sont bien présents

### Erreur 404 Not Found
- Vérifiez que l'URL contient bien votre `PROJECT_REF`
- Vérifiez que la fonction `send-abandoned-cart-emails` est bien déployée

### Aucun email envoyé
- Vérifiez qu'il existe des submissions avec `status = 'pending_payment'`
- Vérifiez que les submissions ont un email valide
- Vérifiez que le timing est respecté (la submission doit avoir été créée il y a assez longtemps)
- Vérifiez que l'email n'a pas déjà été envoyé (dans la table `email_sent`)

### Aucune donnée dans email_sent après l'appel
**Causes possibles** :

1. **Aucune submission éligible** : La fonction retourne `processed: 0, sent: 0`
   ```sql
   -- Vérifier les submissions éligibles
   SELECT id, email, status, created_at, NOW() - created_at as time_elapsed
   FROM submission
   WHERE status = 'pending_payment' AND email IS NOT NULL;
   ```

2. **Erreur silencieuse** : Vérifiez les logs de l'Edge Function `send-transactional-email`
   - Allez dans **Supabase Dashboard** > **Edge Functions** > **send-transactional-email** > **Logs**
   - Cherchez `Error logging email to email_sent: ...`

3. **Tables non créées** : Vérifiez que les migrations ont été exécutées
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('email_sent', 'email_events');
   ```

4. **Permissions RLS** : Vérifiez que `service_role` peut insérer dans `email_sent`
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'email_sent';
   ```

**Voir le fichier `DEBUG_EMAIL_SENT.md` pour un guide de débogage complet.**

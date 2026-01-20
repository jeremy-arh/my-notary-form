# Requêtes SQL pour Tester la Séquence de Relance

## 🚀 Lancer une séquence directement via SQL (RECOMMANDÉ)

### Prérequis
1. **Remplacer les valeurs dans la fonction** :
   - Ouvrez `supabase/migrations/20250120_create_trigger_abandoned_cart_sequence_function.sql`
   - Remplacez `YOUR_PROJECT_REF` par votre référence de projet Supabase
   - Remplacez `YOUR_SERVICE_ROLE_KEY` par votre clé de service role
   - Ou configurez les variables via `current_setting('app.settings.project_ref')` et `current_setting('app.settings.service_role_key')`

2. **Exécuter la migration** :
```sql
-- Exécuter le fichier de migration pour créer les fonctions
```

### Utilisation

```sql
-- Lancer une séquence h+1 pour une submission spécifique
SELECT trigger_abandoned_cart_sequence(
  'VOTRE_SUBMISSION_ID'::UUID,
  'h+1'
);

-- Lancer une séquence j+1
SELECT trigger_abandoned_cart_sequence(
  'VOTRE_SUBMISSION_ID'::UUID,
  'j+1'
);

-- Forcer l'envoi même si le status n'est pas pending_payment (pour les tests)
SELECT force_trigger_abandoned_cart_sequence(
  'VOTRE_SUBMISSION_ID'::UUID,
  'h+1'
);
```

### Étapes de séquence disponibles
- `h+1` : 1 heure après la création
- `j+1` : 24 heures après la création
- `j+3` : 72 heures après la création
- `j+7` : 168 heures après la création
- `j+10` : 240 heures après la création
- `j+15` : 360 heures après la création
- `j+30` : 720 heures après la création

## 🔍 Trouver une submission à tester

```sql
-- Trouver les submissions avec status pending_payment qui peuvent recevoir des emails
SELECT 
  id,
  email,
  first_name,
  last_name,
  status,
  created_at,
  -- Calculer le temps écoulé depuis la création
  NOW() - created_at as time_elapsed,
  -- Calculer quelles séquences devraient être déclenchées
  CASE 
    WHEN NOW() - created_at >= INTERVAL '1 hour' THEN 'h+1 ✓'
    ELSE 'h+1 ✗'
  END as h_plus_1,
  CASE 
    WHEN NOW() - created_at >= INTERVAL '24 hours' THEN 'j+1 ✓'
    ELSE 'j+1 ✗'
  END as j_plus_1,
  CASE 
    WHEN NOW() - created_at >= INTERVAL '72 hours' THEN 'j+3 ✓'
    ELSE 'j+3 ✗'
  END as j_plus_3
FROM submission
WHERE status = 'pending_payment'
  AND email IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

## 📧 Vérifier les emails déjà envoyés pour une submission

```sql
-- Voir tous les emails envoyés pour une submission spécifique
SELECT 
  id,
  email_type,
  subject,
  sent_at,
  delivered_at,
  opened_at,
  clicked_at,
  bounced_at,
  status
FROM email_sent
WHERE submission_id = 'VOTRE_SUBMISSION_ID'
ORDER BY sent_at DESC;
```

## ✅ Vérifier si une séquence spécifique a été envoyée

```sql
-- Vérifier si h+1 a été envoyé pour une submission
SELECT 
  id,
  email_type,
  subject,
  sent_at,
  opened_at,
  clicked_at
FROM email_sent
WHERE submission_id = 'VOTRE_SUBMISSION_ID'
  AND email_type = 'abandoned_cart_h+1';
```

## 🧪 Forcer le déclenchement d'une séquence (modifier la date)

```sql
-- Modifier la date de création pour déclencher h+1 (mettre à il y a 2 heures)
UPDATE submission 
SET created_at = NOW() - INTERVAL '2 hours'
WHERE id = 'VOTRE_SUBMISSION_ID'
  AND status = 'pending_payment';

-- Vérifier la modification
SELECT 
  id,
  email,
  created_at,
  NOW() - created_at as time_elapsed
FROM submission
WHERE id = 'VOTRE_SUBMISSION_ID';
```

## 📊 Voir toutes les submissions qui devraient recevoir un email maintenant

```sql
-- Submissions qui devraient recevoir h+1 (créées il y a plus d'1 heure)
SELECT 
  s.id,
  s.email,
  s.first_name,
  s.last_name,
  s.created_at,
  NOW() - s.created_at as time_elapsed,
  -- Vérifier si l'email a déjà été envoyé
  CASE 
    WHEN es.id IS NOT NULL THEN 'Déjà envoyé ✓'
    ELSE 'À envoyer ✗'
  END as email_status
FROM submission s
LEFT JOIN email_sent es ON es.submission_id = s.id 
  AND es.email_type = 'abandoned_cart_h+1'
WHERE s.status = 'pending_payment'
  AND s.email IS NOT NULL
  AND s.created_at < NOW() - INTERVAL '1 hour'
ORDER BY s.created_at ASC;
```

## 🎯 Requête complète pour tester une séquence spécifique

```sql
-- Pour tester h+1 sur une submission spécifique
-- 1. Vérifier l'état actuel
SELECT 
  s.id,
  s.email,
  s.status,
  s.created_at,
  NOW() - s.created_at as time_elapsed,
  es.email_type as email_already_sent,
  es.sent_at
FROM submission s
LEFT JOIN email_sent es ON es.submission_id = s.id 
  AND es.email_type = 'abandoned_cart_h+1'
WHERE s.id = 'VOTRE_SUBMISSION_ID';

-- 2. Modifier la date pour déclencher h+1
UPDATE submission 
SET created_at = NOW() - INTERVAL '2 hours'
WHERE id = 'VOTRE_SUBMISSION_ID';

-- 3. Vérifier après modification
SELECT 
  id,
  email,
  created_at,
  NOW() - created_at as time_elapsed,
  CASE 
    WHEN NOW() - created_at >= INTERVAL '1 hour' THEN 'h+1 peut être envoyé ✓'
    ELSE 'h+1 ne peut pas être envoyé ✗'
  END as can_send_h_plus_1
FROM submission
WHERE id = 'VOTRE_SUBMISSION_ID';

-- 4. Après l'exécution du cron (ou appel manuel de la fonction), vérifier l'email
SELECT 
  id,
  email_type,
  subject,
  sent_at,
  delivered_at,
  opened_at
FROM email_sent
WHERE submission_id = 'VOTRE_SUBMISSION_ID'
  AND email_type = 'abandoned_cart_h+1';
```

## 🔄 Restaurer la date originale (après test)

```sql
-- Remettre la date de création à maintenant (ou une date spécifique)
UPDATE submission 
SET created_at = NOW()
WHERE id = 'VOTRE_SUBMISSION_ID';
```

## 📈 Statistiques des séquences envoyées

```sql
-- Voir combien d'emails de chaque séquence ont été envoyés
SELECT 
  email_type,
  COUNT(*) as total_sent,
  COUNT(delivered_at) as delivered,
  COUNT(opened_at) as opened,
  COUNT(clicked_at) as clicked,
  COUNT(bounced_at) as bounced
FROM email_sent
WHERE email_type LIKE 'abandoned_cart_%'
GROUP BY email_type
ORDER BY 
  CASE email_type
    WHEN 'abandoned_cart_h+1' THEN 1
    WHEN 'abandoned_cart_j+1' THEN 2
    WHEN 'abandoned_cart_j+3' THEN 3
    WHEN 'abandoned_cart_j+7' THEN 4
    WHEN 'abandoned_cart_j+10' THEN 5
    WHEN 'abandoned_cart_j+15' THEN 6
    WHEN 'abandoned_cart_j+30' THEN 7
  END;
```

## 🧹 Nettoyer les emails de test (optionnel)

```sql
-- Supprimer les emails de test pour une submission
DELETE FROM email_sent
WHERE submission_id = 'VOTRE_SUBMISSION_ID'
  AND email_type LIKE 'abandoned_cart_%';
```

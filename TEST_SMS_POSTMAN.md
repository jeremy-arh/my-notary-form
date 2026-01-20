# Guide pour tester l'envoi d'un SMS avec Postman

## Prérequis

1. **URL de votre projet Supabase** : Trouvez votre `project-ref` dans le dashboard Supabase (Project Settings > General)
2. **Clé API Supabase** : Utilisez votre `anon key` ou `service_role key` depuis le dashboard Supabase (Project Settings > API)

## Configuration Postman

### 1. Méthode et URL

- **Méthode** : `POST`
- **URL** : `https://[VOTRE_PROJECT_REF].supabase.co/functions/v1/send-sms`

**Exemple** :
```
https://abcdefghijklmnop.supabase.co/functions/v1/send-sms
```

### 2. Headers

Ajoutez les headers suivants :

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer [VOTRE_SUPABASE_ANON_KEY]` |
| `apikey` | `[VOTRE_SUPABASE_ANON_KEY]` |

**Exemple** :
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Body (JSON)

Sélectionnez **Body** > **raw** > **JSON** et utilisez l'un des exemples ci-dessous :

#### Exemple 1 : SMS de notification simple

```json
{
  "sms_type": "notification",
  "phone_number": "+33612345678",
  "recipient_name": "Jean Dupont",
  "recipient_type": "client",
  "message": "Bonjour, ceci est un SMS de test depuis Postman !",
  "data": {}
}
```

#### Exemple 2 : SMS avec message personnalisé (sans template)

```json
{
  "sms_type": "notification",
  "phone_number": "+33612345678",
  "recipient_name": "Marie Martin",
  "recipient_type": "client",
  "message": "Votre document a été notarisé avec succès. Merci de votre confiance !",
  "data": {}
}
```

#### Exemple 3 : SMS de relance panier abandonné (J+1)

```json
{
  "sms_type": "abandoned_cart_j+1",
  "phone_number": "+33612345678",
  "recipient_name": "Pierre Durand",
  "recipient_type": "client",
  "data": {
    "submission_id": "123e4567-e89b-12d3-a456-426614174000",
    "contact": {
      "PRENOM": "Pierre"
    }
  }
}
```

#### Exemple 4 : SMS de relance panier abandonné (J+3)

```json
{
  "sms_type": "abandoned_cart_j+3",
  "phone_number": "+33612345678",
  "recipient_name": "Sophie Bernard",
  "recipient_type": "client",
  "data": {
    "submission_id": "123e4567-e89b-12d3-a456-426614174000",
    "contact": {
      "PRENOM": "Sophie"
    }
  }
}
```

#### Exemple 5 : SMS de relance panier abandonné (J+10)

```json
{
  "sms_type": "abandoned_cart_j+10",
  "phone_number": "+33612345678",
  "recipient_name": "Luc Petit",
  "recipient_type": "client",
  "data": {
    "submission_id": "123e4567-e89b-12d3-a456-426614174000",
    "contact": {
      "PRENOM": "Luc"
    }
  }
}
```

## Structure de la requête

### Champs obligatoires

- `sms_type` : Type de SMS (`'abandoned_cart_j+1'` | `'abandoned_cart_j+3'` | `'abandoned_cart_j+10'` | `'notification'`)
- `phone_number` : Numéro de téléphone au format international (ex: `+33612345678`)
- `recipient_name` : Nom du destinataire
- `recipient_type` : Type de destinataire (`'client'` | `'notary'`)
- `data` : Objet contenant les données optionnelles

### Champs optionnels

- `message` : Message personnalisé (si non fourni, un template sera utilisé selon le `sms_type`)
- `data.submission_id` : ID de la soumission (UUID)
- `data.contact.PRENOM` : Prénom pour la personnalisation du message

## Réponse attendue

### Succès (200)

```json
{
  "success": true,
  "message": "SMS sent successfully",
  "recipient": "+33612345678",
  "sms_type": "notification",
  "twilio_message_sid": "SM1234567890abcdef"
}
```

### Erreur (400/500)

```json
{
  "error": "sms_type, phone_number, and recipient_name are required"
}
```

ou

```json
{
  "error": "Twilio credentials are not configured"
}
```

## Notes importantes

1. **Format du numéro de téléphone** : Utilisez le format international avec le préfixe `+` (ex: `+33612345678` pour la France)

2. **Templates automatiques** : Si vous ne fournissez pas de `message` pour les types `abandoned_cart_*`, un template prédéfini sera utilisé avec le prénom du contact

3. **Environnement Twilio** : Assurez-vous que les variables d'environnement Twilio sont configurées dans Supabase :
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`

4. **Logs** : Le SMS sera automatiquement enregistré dans la table `sms_sent` de votre base de données Supabase

5. **Test en mode développement** : Pour tester localement avec Supabase CLI :
   ```bash
   supabase functions serve send-sms
   ```
   Puis utilisez l'URL locale : `http://localhost:54321/functions/v1/send-sms`

## Collection Postman

Vous pouvez créer une collection Postman avec :
- **Variables d'environnement** :
  - `supabase_url` : `https://[VOTRE_PROJECT_REF].supabase.co`
  - `supabase_anon_key` : Votre clé API anonyme
  - `test_phone_number` : Votre numéro de test

- **Requête** :
  - URL : `{{supabase_url}}/functions/v1/send-sms`
  - Headers : Utilisez `{{supabase_anon_key}}` dans les headers
  - Body : Utilisez les exemples ci-dessus

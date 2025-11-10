# Configuration des emails transactionnels avec SendGrid

Ce guide explique comment configurer les emails transactionnels pour les actions spécifiques de l'application.

## 📋 Vue d'ensemble

Les emails transactionnels sont envoyés automatiquement pour ces actions :
1. **Paiement réussi** - Email avec facture jointe
2. **Échec du paiement** - Email avec message d'erreur
3. **Notaire assigné** - Email au client
4. **Fichier notarisé uploadé** - Email au client avec lien
5. **Message reçu** - Email avec aperçu du message et lien

## 🚀 Configuration

### Étape 1 : Déployer les Edge Functions

```bash
# Déployer la fonction d'emails transactionnels
supabase functions deploy send-transactional-email

# Déployer le webhook Stripe (optionnel, pour les échecs de paiement)
supabase functions deploy stripe-webhook
```

### Étape 2 : Configurer les secrets Supabase

Dans **Supabase Dashboard** > **Project Settings** > **Vault**, ajoutez :

```
SENDGRID_API_KEY = SG.votre_cle_api_sendgrid
SENDGRID_FROM_EMAIL = support@mynotary.io
SENDGRID_FROM_NAME = MY NOTARY
CLIENT_DASHBOARD_URL = https://client.mynotary.io
NOTARY_DASHBOARD_URL = https://notary.mynotary.io
```

### Étape 3 : Configurer le webhook Stripe (optionnel)

1. Allez dans **Stripe Dashboard** > **Developers** > **Webhooks**
2. Cliquez sur **Add endpoint**
3. URL : `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
4. Événements à écouter :
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
5. Copiez le **Webhook Secret**
6. Ajoutez-le aux secrets Supabase : `STRIPE_WEBHOOK_SECRET`

## 📧 Types d'emails

### 1. Paiement réussi (`payment_success`)

**Déclenché** : Après vérification du paiement dans `verify-payment`

**Contenu** :
- Confirmation du paiement
- Montant payé
- Date du paiement
- Lien pour télécharger la facture
- Lien vers la soumission

**Fichier joint** : Facture PDF (optionnel)

### 2. Échec du paiement (`payment_failed`)

**Déclenché** : Via webhook Stripe `payment_intent.payment_failed`

**Contenu** :
- Message d'échec
- Raison de l'échec
- Lien pour réessayer le paiement

### 3. Notaire assigné (`notary_assigned`)

**Déclenché** : Quand un admin assigne un notaire à une soumission

**Contenu** :
- Nom du notaire assigné
- Lien vers la soumission
- Message de confirmation

### 4. Fichier notarisé uploadé (`notarized_file_uploaded`)

**Déclenché** : Quand un notaire upload un fichier notarisé

**Contenu** :
- Nom du fichier
- Lien vers les documents notarisés
- Lien vers la soumission

### 5. Message reçu (`message_received`)

**Déclenché** : Quand un message est envoyé dans le chat

**Contenu** :
- Aperçu du message (100 premiers caractères)
- Lien vers la conversation
- Lien vers la soumission

## 🔧 Intégration dans le code

### Paiement réussi

Déjà intégré dans `supabase/functions/verify-payment/index.ts` :

```typescript
// Envoie automatiquement un email après vérification du paiement
await supabase.functions.invoke('send-transactional-email', {
  body: {
    email_type: 'payment_success',
    recipient_email: clientData.email,
    recipient_name: clientName,
    recipient_type: 'client',
    data: {
      submission_id: submissionId,
      submission_number: submissionNumber,
      payment_amount: amount,
      invoice_url: invoiceUrl
    }
  }
});
```

### Notaire assigné

Déjà intégré dans `notary-admin/src/pages/admin/Submissions.jsx` et `SubmissionDetail.jsx` :

```javascript
const { sendTransactionalEmail } = await import('../../utils/sendTransactionalEmail');
await sendTransactionalEmail(supabase, {
  email_type: 'notary_assigned',
  recipient_email: clientData.email,
  recipient_name: clientName,
  recipient_type: 'client',
  data: {
    submission_id: submissionId,
    submission_number: submissionNumber,
    notary_name: notaryName
  }
});
```

### Fichier notarisé uploadé

Déjà intégré dans `notary-dashboard/src/pages/notary/SubmissionDetail.jsx` :

```javascript
const { sendTransactionalEmail } = await import('../../utils/sendTransactionalEmail');
await sendTransactionalEmail(supabase, {
  email_type: 'notarized_file_uploaded',
  recipient_email: clientInfo.email,
  recipient_name: clientName,
  recipient_type: 'client',
  data: {
    submission_id: id,
    submission_number: submissionNumber,
    file_name: file.name,
    file_url: fileData.file_url
  }
});
```

### Message reçu

Déjà intégré dans `client-dashboard/src/components/Chat.jsx` et `notary-dashboard/src/components/Chat.jsx` :

```javascript
const { sendTransactionalEmail } = await import('../utils/sendTransactionalEmail');
await sendTransactionalEmail(supabase, {
  email_type: 'message_received',
  recipient_email: recipientEmail,
  recipient_name: recipientName,
  recipient_type: recipientType,
  data: {
    submission_id: submissionId,
    submission_number: submissionNumber,
    message_preview: messagePreview
  }
});
```

## 🎨 Templates d'emails

Les templates sont générés dynamiquement dans l'Edge Function `send-transactional-email`. Chaque email a :
- Design professionnel et responsive
- Couleurs adaptées au type d'email
- Boutons d'action clairs
- Footer avec lien vers le tableau de bord

## 📝 Variables disponibles

Chaque type d'email peut utiliser ces variables dans les données :

- `submission_id` - ID de la soumission
- `submission_number` - Numéro de soumission (8 premiers caractères)
- `payment_amount` - Montant du paiement (pour payment_success)
- `payment_date` - Date du paiement (pour payment_success)
- `invoice_url` - URL de la facture (pour payment_success)
- `error_message` - Message d'erreur (pour payment_failed)
- `notary_name` - Nom du notaire (pour notary_assigned)
- `file_name` - Nom du fichier (pour notarized_file_uploaded)
- `file_url` - URL du fichier (pour notarized_file_uploaded)
- `message_preview` - Aperçu du message (pour message_received)

## 🧪 Tests

### Tester l'Edge Function

```bash
# Tester un email de paiement réussi
supabase functions invoke send-transactional-email \
  --data '{
    "email_type": "payment_success",
    "recipient_email": "test@example.com",
    "recipient_name": "Test User",
    "recipient_type": "client",
    "data": {
      "submission_id": "test-id",
      "submission_number": "test1234",
      "payment_amount": 100.00,
      "payment_date": "2024-01-01",
      "invoice_url": "https://example.com/invoice.pdf"
    }
  }'
```

### Vérifier les logs

```bash
# Logs de l'Edge Function
supabase functions logs send-transactional-email

# Logs du webhook Stripe
supabase functions logs stripe-webhook
```

## 🔍 Dépannage

### Les emails ne sont pas envoyés

1. Vérifiez que `SENDGRID_API_KEY` est correct
2. Vérifiez les logs de l'Edge Function
3. Vérifiez SendGrid Activity pour voir les erreurs

### L'email arrive mais le design est cassé

1. Les templates utilisent des styles inline (compatible avec tous les clients email)
2. Vérifiez que le HTML est correct dans l'Edge Function

### Le webhook Stripe ne fonctionne pas

1. Vérifiez que `STRIPE_WEBHOOK_SECRET` est configuré
2. Vérifiez que l'URL du webhook est correcte dans Stripe
3. Vérifiez les logs du webhook

## 📚 Documentation

- **Edge Function README** : `supabase/functions/send-transactional-email/README.md`
- **SendGrid Documentation** : https://docs.sendgrid.com/
- **Stripe Webhooks** : https://stripe.com/docs/webhooks

## ✅ Checklist de déploiement

- [ ] Edge Function `send-transactional-email` déployée
- [ ] Secrets Supabase configurés
- [ ] Webhook Stripe configuré (optionnel)
- [ ] Test d'envoi d'email réussi
- [ ] Vérification que les emails arrivent bien
- [ ] Vérification que les liens de redirection fonctionnent

## 🎯 Résultat

- ✅ Les clients reçoivent des emails pour les actions importantes
- ✅ Les notaires reçoivent des emails pour les messages
- ✅ Les emails ont un design professionnel
- ✅ Les emails contiennent des liens vers les pages concernées
- ✅ Les factures sont jointes aux emails de paiement (via URL)


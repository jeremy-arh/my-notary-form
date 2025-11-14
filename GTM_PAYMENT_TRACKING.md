# 💳 Tracking des Paiements dans GTM

## 📊 État Actuel

### ❌ Problème Identifié

**Le tracking de paiement n'est PAS implémenté** dans la page `PaymentSuccess.jsx`.

### 🔍 Flux Actuel

1. **Paiement Stripe** → Redirection vers `/payment/success?session_id=...`
2. **Page PaymentSuccess.jsx** → Vérifie le paiement via `verify-payment` Edge Function
3. **❌ Aucun événement GTM n'est envoyé**

---

## ✅ Solution : Ajouter le Tracking

### Étape 1 : Créer un Utilitaire de Tracking

Créez `client-dashboard/src/utils/gtm.js` ou `client-dashboard/src/utils/plausible.js` :

```javascript
// Pour GTM
export const trackPaymentSuccess = (paymentData) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'payment_success',
      event_name: 'payment_success', // Pour GTM server-side
      transaction_id: paymentData.transactionId,
      value: paymentData.amount,
      currency: paymentData.currency || 'EUR',
      submission_id: paymentData.submissionId,
      services_count: paymentData.servicesCount || 0
    });
  }
};

// Pour Plausible (si vous utilisez le paquet NPM)
import { trackEvent } from 'plausible-tracker';
export const trackPaymentSuccessPlausible = (paymentData) => {
  trackEvent('payment_success', {
    props: {
      transaction_id: paymentData.transactionId,
      value: paymentData.amount,
      currency: paymentData.currency || 'EUR',
      submission_id: paymentData.submissionId
    }
  });
};
```

### Étape 2 : Ajouter le Tracking dans PaymentSuccess.jsx

Modifiez `client-dashboard/src/pages/PaymentSuccess.jsx` :

```javascript
import { trackPaymentSuccess } from '../utils/gtm'; // ou plausible

// Dans le useEffect, après la vérification réussie :
if (data.verified && data.submissionId) {
  setSubmissionId(data.submissionId);
  setInvoiceUrl(data.invoiceUrl);
  
  // ✅ Ajouter le tracking ici
  trackPaymentSuccess({
    transactionId: sessionId,
    amount: data.amount || 0, // Récupérer depuis la réponse
    currency: data.currency || 'EUR',
    submissionId: data.submissionId,
    servicesCount: data.servicesCount || 0
  });
}
```

---

## 📋 Données Disponibles depuis verify-payment

D'après `supabase/functions/verify-payment/index.ts`, la fonction retourne :

```typescript
{
  verified: true,
  submissionId: string,
  invoiceUrl: string | null
}
```

**Problème** : Les données de montant ne sont pas retournées par `verify-payment`.

### Solution : Modifier verify-payment pour retourner plus de données

Dans `supabase/functions/verify-payment/index.ts`, modifiez le return :

```typescript
return new Response(
  JSON.stringify({
    verified: true,
    submissionId: submissionId,
    invoiceUrl: invoiceUrl,
    // ✅ Ajouter ces données pour le tracking
    amount: session.amount_total / 100, // Convertir de centimes en euros
    currency: session.currency.toUpperCase(),
    transactionId: sessionId
  }),
  {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  }
)
```

---

## 🎯 Configuration GTM Requise

### Déclencheur

Dans GTM, créez un déclencheur :
- **Nom** : `Payment Success`
- **Type** : Événement personnalisé
- **Nom de l'événement** : `payment_success`

### Variables

Créez ces variables pour récupérer les données :
- `{{Transaction ID}}` : Event Data → `transaction_id`
- `{{Conversion Value}}` : Event Data → `value`
- `{{Conversion Currency}}` : Event Data → `currency`
- `{{Submission ID}}` : Event Data → `submission_id`

### Balises Google Ads

Configurez vos balises Google Ads Conversion Tracking pour se déclencher sur `payment_success` avec :
- **Valeur** : `{{Conversion Value}}`
- **Devise** : `{{Conversion Currency}}`
- **ID de transaction** : `{{Transaction ID}}`

---

## 🔄 Flux Complet Après Implémentation

1. **Utilisateur paie** → Stripe Checkout
2. **Redirection** → `/payment/success?session_id=...`
3. **PaymentSuccess.jsx** → Appelle `verify-payment`
4. **✅ Envoie événement GTM** → `payment_success` avec toutes les données
5. **GTM déclenche** → Balises Google Ads Conversion Tracking
6. **Conversion trackée** → Dans Google Ads

---

## 📝 Checklist d'Implémentation

- [ ] Créer `client-dashboard/src/utils/gtm.js` (ou `plausible.js`)
- [ ] Modifier `verify-payment` pour retourner `amount`, `currency`, `transactionId`
- [ ] Ajouter `trackPaymentSuccess` dans `PaymentSuccess.jsx`
- [ ] Vérifier que le script GTM est présent dans `client-dashboard/index.html`
- [ ] Tester un paiement réel
- [ ] Vérifier dans GTM Debug Mode que l'événement `payment_success` apparaît
- [ ] Vérifier dans Google Ads que la conversion est trackée

---

## 🚨 Important

**Actuellement, aucun événement de paiement n'est tracké dans GTM.** Il faut implémenter le tracking pour que Google Ads puisse suivre les conversions.


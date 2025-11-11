# Documentation des Événements GTM

## Résumé des événements envoyés à GTM

### 📍 **1. Événement `page_view`**

**Où** : Formulaire (`src/components/NotaryForm.jsx`)
**Quand** : À chaque changement de route/étape du formulaire
**Données envoyées** :
```javascript
{
  event: "page_view",
  event_name: "page_view",  // Pour GTM server-side
  page_name: "Documents" | "Choose option" | "Book an appointment" | "Your personal informations" | "Summary",
  page_path: "/documents" | "/choose-option" | "/book-appointment" | "/personal-info" | "/summary",
  page_title: "Demande de Service Notarié",
  page_location: "https://app.mynotary.io/form/documents",
  page_referrer: "https://...",
  screen_resolution: "1920x1080"
}
```

**Status** : ✅ **ACTIF** - Envoyé automatiquement lors de la navigation

---

### 📝 **2. Événement `form_step_completed`**

**Où** : Formulaire (`src/components/NotaryForm.jsx`)
**Quand** : Quand un utilisateur complète une étape du formulaire (clique sur "Next")
**Données envoyées** :
```javascript
{
  event: "form_step_completed",
  event_name: "form_step_completed",
  step_number: 1 | 2 | 3 | 4 | 5,
  step_name: "Documents" | "Choose option" | "Book an appointment" | "Your personal informations" | "Summary"
}
```

**Status** : ✅ **ACTIF** - Envoyé lors de la complétion d'une étape

---

### 🚀 **3. Événement `form_submission_start`**

**Où** : Formulaire (`src/components/NotaryForm.jsx`)
**Quand** : Quand l'utilisateur soumet le formulaire (clique sur "Submit" dans Summary)
**Données envoyées** :
```javascript
{
  event: "form_submission_start",
  event_name: "form_submission_start",
  form_type: "notary_service",
  options_count: 2,  // Nombre d'options sélectionnées
  documents_count: 5  // Nombre de documents uploadés
}
```

**Status** : ✅ **ACTIF** - Envoyé avant la soumission du formulaire

---

### ✅ **4. Événement `form_submit`**

**Où** : Formulaire (`src/components/NotaryForm.jsx`)
**Quand** : Après une soumission réussie du formulaire
**Données envoyées** :
```javascript
{
  event: "form_submit",
  event_name: "form_submit",
  form_type: "notary_service",
  submission_id: "abc123-def456-ghi789",
  options_count: 2,
  documents_count: 5
}
```

**Status** : ✅ **ACTIF** - Envoyé après soumission réussie

---

### 💰 **5. Événement `purchase`** ⭐ **POUR CONVERSIONS GOOGLE ADS**

**Où** : Client Dashboard (`client-dashboard/src/pages/PaymentSuccess.jsx`)
**Quand** : Après vérification réussie d'un paiement Stripe
**Données envoyées** :
```javascript
{
  event: "purchase",
  event_name: "purchase",
  transaction_id: "cs_test_a1b2c3d4e5f6...",
  value: 150.00,  // Montant en nombre (EUR)
  currency: "EUR",
  submission_id: "abc123-def456-ghi789",
  services_count: 0
}
```

**Variables GTM utilisées** :
- `transaction_id` → Variable "Transaction ID" (Data Layer Variable: `transaction_id`)
- `value` → Variable "Transaction Value" (Data Layer Variable: `value`)
- `currency` → Variable "Currency" (Data Layer Variable: `currency`)

**Déclencheur GTM** : Événement personnalisé `purchase`
**Balise déclenchée** : "Google Ads - Conversion Purchase"

**Status** : ✅ **ACTIF** - Envoyé après paiement réussi

---

### ❌ **6. Événement `payment_failed`**

**Où** : Client Dashboard (`client-dashboard/src/utils/gtm.js`)
**Quand** : En cas d'échec de paiement (non utilisé actuellement)
**Données envoyées** :
```javascript
{
  event: "payment_failed",
  event_name: "payment_failed",
  error_message: "Payment failed",
  submission_id: "abc123-def456-ghi789"
}
```

**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ** - Fonction disponible mais non appelée

---

## Événements définis mais NON utilisés (Site Web)

Les événements suivants sont définis dans `new-site/notary-site/src/utils/gtm.js` mais **ne sont pas encore appelés** dans le code :

### 📍 **7. Événement `page_view` (Site Web)**

**Où** : Site Web (`new-site/notary-site/src/utils/gtm.js`)
**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### 🎯 **8. Événement `cta_click`**

**Où** : Site Web (`new-site/notary-site/src/utils/gtm.js`)
**Données prévues** :
```javascript
{
  event: "cta_click",
  event_name: "cta_click",
  cta_type: "book_appointment",
  cta_location: "hero" | "navbar" | "mobile" | "how_it_works",
  destination: "https://app.mynotary.io/form"
}
```

**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### 🛎️ **9. Événement `service_click`**

**Où** : Site Web (`new-site/notary-site/src/utils/gtm.js`)
**Données prévues** :
```javascript
{
  event: "service_click",
  event_name: "service_click",
  service_id: "service-123",
  service_name: "Notarization",
  click_location: "homepage_services" | "service_detail_page"
}
```

**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### 🔐 **10. Événement `login_click`**

**Où** : Site Web (`new-site/notary-site/src/utils/gtm.js`)
**Données prévues** :
```javascript
{
  event: "login_click",
  event_name: "login_click",
  click_location: "navbar" | "mobile_menu",
  destination: "https://app.mynotary.io/login"
}
```

**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### 🧭 **11. Événement `navigation_click`**

**Où** : Site Web (`new-site/notary-site/src/utils/gtm.js`)
**Données prévues** :
```javascript
{
  event: "navigation_click",
  event_name: "navigation_click",
  link_text: "Services" | "About" | "Blog",
  destination: "/services" | "/about" | "/blog"
}
```

**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### 📰 **12. Événement `blog_post_view`**

**Où** : Site Web (`new-site/notary-site/src/utils/gtm.js`)
**Données prévues** :
```javascript
{
  event: "blog_post_view",
  event_name: "blog_post_view",
  post_slug: "how-to-notarize-documents",
  post_title: "How to Notarize Documents"
}
```

**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### ❓ **13. Événement `faq_toggle`**

**Où** : Site Web (`new-site/notary-site/src/utils/gtm.js`)
**Données prévues** :
```javascript
{
  event: "faq_toggle",
  event_name: "faq_toggle",
  faq_index: 0,
  faq_question: "What is notarization?"
}
```

**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### 🔗 **14. Événement `external_link_click`**

**Où** : Site Web (`new-site/notary-site/src/utils/gtm.js`)
**Données prévues** :
```javascript
{
  event: "external_link_click",
  event_name: "external_link_click",
  url: "https://example.com",
  link_text: "Learn more"
}
```

**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

## Événements définis mais NON utilisés (Formulaire)

### 🛎️ **15. Événement `service_selected`**

**Où** : Formulaire (`src/utils/gtm.js`)
**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### 📄 **16. Événement `document_uploaded`**

**Où** : Formulaire (`src/utils/gtm.js`)
**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

### 📅 **17. Événement `appointment_booked`**

**Où** : Formulaire (`src/utils/gtm.js`)
**Status** : ⚠️ **DÉFINI MAIS NON UTILISÉ**

---

## Résumé

### ✅ Événements ACTIFS (5)
1. `page_view` (Formulaire)
2. `form_step_completed` (Formulaire)
3. `form_submission_start` (Formulaire)
4. `form_submit` (Formulaire)
5. `purchase` (Client Dashboard) ⭐ **POUR GOOGLE ADS**

### ⚠️ Événements DÉFINIS MAIS NON UTILISÉS (12)
- `payment_failed` (Client Dashboard)
- `page_view` (Site Web)
- `cta_click` (Site Web)
- `service_click` (Site Web)
- `login_click` (Site Web)
- `navigation_click` (Site Web)
- `blog_post_view` (Site Web)
- `faq_toggle` (Site Web)
- `external_link_click` (Site Web)
- `service_selected` (Formulaire)
- `document_uploaded` (Formulaire)
- `appointment_booked` (Formulaire)

---

## Configuration GTM Requise

### Pour l'événement `purchase` (Google Ads Conversion)

**Variables GTM à créer** :
1. **Transaction ID** : Variable de la couche de données, nom de la variable : `transaction_id`
2. **Transaction Value** : Variable de la couche de données, nom de la variable : `value`
3. **Currency** : Variable de la couche de données, nom de la variable : `currency`

**Déclencheur GTM** :
- Type : Événement personnalisé
- Nom de l'événement : `purchase`

**Balise GTM** :
- Type : Suivi des conversions Google Ads
- ID de conversion : `AW-17719745439`
- Libellé de conversion : [À configurer]
- Valeur de conversion : `{{Transaction Value}}`
- Code devise : `{{Currency}}`
- ID de transaction : `{{Transaction ID}}`
- Déclencheur : Événement personnalisé `purchase`

---

## Format des données dans dataLayer

Tous les événements sont envoyés avec cette structure :
```javascript
window.dataLayer.push({
  event: "event_name",        // Pour GTM client-side
  event_name: "event_name",   // Pour GTM server-side
  ...eventData                // Données supplémentaires
});
```

Les deux clés (`event` et `event_name`) permettent la compatibilité avec :
- **GTM Client-Side** : utilise `event`
- **GTM Server-Side** : utilise `event_name`

---

## Prochaines étapes recommandées

1. **Intégrer les événements du site Web** :
   - Ajouter `trackPageView` dans `App.jsx` pour le routing
   - Ajouter `trackCTAClick` dans les composants Hero, Navbar, MobileCTA
   - Ajouter `trackServiceClick` dans les composants Services
   - Ajouter `trackLoginClick` dans Navbar
   - Ajouter `trackNavigationClick` dans Navbar
   - Ajouter `trackBlogPostView` dans BlogPost

2. **Intégrer les événements du formulaire** :
   - Ajouter `trackServiceSelection` lors de la sélection d'un service
   - Ajouter `trackDocumentUpload` lors de l'upload de documents
   - Ajouter `trackAppointmentBooking` lors de la réservation d'un rendez-vous

3. **Intégrer `trackPaymentFailure`** :
   - Ajouter dans la gestion des erreurs de paiement


# Configuration des Événements GTM (Google Tag Manager)

Ce document liste tous les événements envoyés au dataLayer GTM pour le formulaire de notarisation.

## 📊 Événements trackés

### Navigation et Démarrage

#### 1. **`page_view`**
Envoyé à chaque navigation dans le formulaire.

**Propriétés:**
```javascript
{
  event: 'page_view',
  page_title: 'Step 1 - Choose Services',
  page_location: 'https://app.mynotary.io/form/choose-services',
  page_path: '/form/choose-services',
  page_name: 'Choose Services',
  page_referrer: 'https://mynotary.io/',
  screen_resolution: '1920x1080'
}
```

#### 2. **`form_start`**
Envoyé quand l'utilisateur arrive sur la première étape du formulaire.

**Propriétés:**
```javascript
{
  event: 'form_start',
  form_name: 'notarization_form',
  service_type: 'Document Notarization',
  cta_location: 'homepage_hero',
  cta_text: 'Commencer ma notarisation'
}
```

### Progression dans le Formulaire

#### 3. **`form_step_completed`**
Envoyé à chaque fois qu'une étape est complétée.

**Propriétés:**
```javascript
{
  event: 'form_step_completed',
  step_number: 1,
  step_name: 'Choose Services'
}
```

#### 4. **`service_selected`**
Envoyé quand l'utilisateur sélectionne au moins un service (étape 1 complétée).

**Propriétés:**
```javascript
{
  event: 'service_selected',
  services_count: 2,
  service_ids: 'service-1,service-2'
}
```

#### 5. **`document_uploaded`**
Envoyé quand l'utilisateur upload des documents (étape 2 complétée).

**Propriétés:**
```javascript
{
  event: 'document_uploaded',
  documents_count: 3,
  services_with_docs: 2
}
```

#### 6. **`signatories_added`**
Envoyé quand l'utilisateur ajoute des signataires (étape 3 complétée).

**Propriétés:**
```javascript
{
  event: 'signatories_added',
  signatories_count: 2
}
```

#### 7. **`appointment_booked`**
Envoyé quand l'utilisateur réserve un rendez-vous (étape 4 complétée).

**Propriétés:**
```javascript
{
  event: 'appointment_booked',
  appointment_date: '2024-12-25',
  appointment_time: '14:00',
  timezone: 'UTC+1'
}
```

#### 8. **`personal_info_completed`**
Envoyé quand l'utilisateur complète ses informations personnelles (étape 5 complétée).

**Propriétés:**
```javascript
{
  event: 'personal_info_completed',
  is_authenticated: true
}
```

#### 9. **`summary_viewed`**
Envoyé quand l'utilisateur arrive sur la page de résumé (étape 6).

**Propriétés:**
```javascript
{
  event: 'summary_viewed',
  total_services: 2,
  total_documents: 3,
  total_signatories: 2,
  has_appointment: true
}
```

### Paiement et Conversion

#### 10. **`form_submission_start`**
Envoyé juste avant l'appel à la fonction de soumission.

**Propriétés:**
```javascript
{
  event: 'form_submission_start',
  form_type: 'notary_service',
  options_count: 2,
  documents_count: 3
}
```

#### 11. **`payment_initiated`**
Envoyé quand l'utilisateur clique sur "Confirm & Pay" et que le processus de paiement démarre.

**Propriétés:**
```javascript
{
  event: 'payment_initiated',
  total_amount: 150.00,
  currency: 'EUR',
  services_count: 2
}
```

#### 12. **`begin_checkout`**
Envoyé quand l'utilisateur clique sur "Confirm & Pay" (pour Google Ads).

**Propriétés (format E-commerce):**
```javascript
{
  event: 'begin_checkout',
  currency: 'EUR',
  value: 150.00,
  items: [
    {
      item_id: 'service-1',
      item_name: 'Document Notarization',
      item_category: 'Notarization Service',
      price: 75.00,
      quantity: 1
    },
    {
      item_id: 'service-2',
      item_name: 'Apostille Service',
      item_category: 'Notarization Service',
      price: 75.00,
      quantity: 1
    }
  ]
}
```

#### 13. **`purchase`** 🎯 (Conversion principale)
Envoyé quand le paiement est confirmé avec succès.

**Propriétés (format Enhanced Conversions):**
```javascript
{
  event: 'purchase',
  transaction_id: 'sub_1234567890',
  value: 150.00,
  currency: 'EUR',
  user_data: {
    email: 'john@example.com',
    phone_number: '+33612345678',
    address: {
      first_name: 'John',
      last_name: 'Doe',
      postal_code: '75001',
      country: 'FR'
    }
  },
  items: [
    {
      item_id: 'service-1',
      item_name: 'Document Notarization',
      price: 75.00,
      quantity: 1
    },
    {
      item_id: 'service-2',
      item_name: 'Apostille Service',
      price: 75.00,
      quantity: 1
    }
  ],
  new_customer: true,
  services_count: 2
}
```

#### 14. **`payment_failure`**
Envoyé si le paiement échoue.

**Propriétés:**
```javascript
{
  event: 'payment_failure',
  error_message: 'Payment declined',
  submission_id: 'sub_1234567890'
}
```

#### 15. **`form_submit`**
Envoyé après une soumission réussie du formulaire.

**Propriétés:**
```javascript
{
  event: 'form_submit',
  form_type: 'notary_service',
  submission_id: 'sub_1234567890',
  options_count: 2,
  documents_count: 3
}
```

## 🎯 Configuration dans GTM

### Étape 1 : Créer les Tags

Pour chaque événement ci-dessus, créez un tag dans GTM :

1. **Type de tag :** Google Ads Remarketing ou Google Ads Conversion Tracking
2. **Déclencheur :** Événement personnalisé avec le nom de l'événement (ex: `service_selected`)
3. **Variables :** Créez des variables de couche de données pour capturer les propriétés

### Étape 2 : Configuration des Conversions Google Ads

#### Conversion Principale : `purchase`
- **Type :** Conversion d'achat
- **Valeur :** Variable `{{value}}`
- **ID de transaction :** Variable `{{transaction_id}}`
- **Enhanced Conversions :** Activé (utilise `user_data`)

#### Conversion Secondaire : `begin_checkout`
- **Type :** Début de paiement
- **Valeur :** Variable `{{value}}`

### Étape 3 : Configuration du Remarketing

Créez des audiences dans Google Ads basées sur ces événements :

- **Abandons de panier :** `begin_checkout` sans `purchase`
- **Utilisateurs ayant vu le résumé :** `summary_viewed` sans `purchase`
- **Par type de service :** Filtrer par `service_ids`

## 📈 Funnel de Conversion

Le funnel complet dans GTM :

```
form_start (100%)
  ↓
service_selected (80%)
  ↓
document_uploaded (70%)
  ↓
signatories_added (65%)
  ↓
appointment_booked (60%)
  ↓
personal_info_completed (55%)
  ↓
summary_viewed (50%)
  ↓
payment_initiated (45%)
  ↓
begin_checkout (45%)
  ↓
purchase (40%) 🎯
```

## 🔗 Intégration avec Google Ads

### Variables GTM requises

Créez ces variables de couche de données dans GTM :

- `{{dlv - transaction_id}}`
- `{{dlv - value}}`
- `{{dlv - currency}}`
- `{{dlv - items}}`
- `{{dlv - user_data}}`
- `{{dlv - services_count}}`
- `{{dlv - documents_count}}`
- `{{dlv - appointment_date}}`
- etc.

### Tags Google Ads requis

1. **Tag de conversion "Purchase"** (ID: `AW-XXXXX/YYYYY`)
2. **Tag de remarketing global** (ID: `AW-XXXXX`)
3. **Tag Enhanced Conversions** (utilise `user_data`)

## 🧪 Test et Débogage

### Mode Aperçu GTM

1. Activez le mode Aperçu dans GTM
2. Naviguez dans le formulaire
3. Vérifiez que tous les événements se déclenchent correctement

### Console Browser

Les événements sont loggés dans la console :
```javascript
📊 [GTM] Event pushed to dataLayer: {event: "service_selected", ...}
```

### Google Tag Assistant

Utilisez l'extension Chrome "Tag Assistant" pour vérifier :
- Les tags se déclenchent
- Les données sont correctement passées
- Les conversions Google Ads sont enregistrées

## 📝 Notes Importantes

1. **Enhanced Conversions :** L'événement `purchase` inclut `user_data` pour améliorer la précision des conversions Google Ads.

2. **E-commerce :** Les événements `begin_checkout` et `purchase` utilisent le format E-commerce standard.

3. **RGPD :** Les données utilisateur sont hachées côté serveur avant d'être envoyées (recommandé).

4. **Double Tracking :** Les événements sont envoyés à la fois à GTM ET à Plausible Analytics pour avoir deux sources de données.


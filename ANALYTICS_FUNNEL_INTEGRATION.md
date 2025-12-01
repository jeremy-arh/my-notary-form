# Guide d'intégration du Funnel Analytics détaillé

Ce guide explique comment intégrer le tracking détaillé pour le funnel de conversion dans le formulaire.

## 📊 Structure du Funnel

Le funnel est structuré en 3 catégories :
- **Awareness** : Prise de conscience (ouverture du formulaire)
- **Engagement** : Engagement (ouverture des écrans)
- **Conversion** : Actions complétées (sélection, upload, etc.)

## 🎯 Étapes du Funnel

### 1. Awareness
- `form_opened` - Formulaire ouvert
- `form_start` - Démarrage du formulaire

### 2. Engagement (Ouverture des écrans)
- `screen_opened` - Écran Services ouvert
- `document_screen_opened` - Écran Documents ouvert
- `signatory_screen_opened` - Écran Signataires ouvert
- `appointment_screen_opened` - Écran Rendez-vous ouvert
- `personal_info_screen_opened` - Écran Infos personnelles ouvert
- `summary_screen_opened` - Écran Résumé ouvert

### 3. Conversion (Actions complétées)
- `service_selected` - Services sélectionnés
- `services_selection_completed` - Sélection services complétée
- `document_uploaded` - Documents uploadés
- `documents_upload_completed` - Upload documents complété
- `signatories_added` - Signataires ajoutés
- `signatories_completed` - Signataires complétés
- `appointment_booked` - Rendez-vous réservé
- `personal_info_completed` - Infos personnelles complétées
- `summary_viewed` - Résumé visualisé
- `payment_initiated` - Paiement initié
- `purchase` - Conversion finale

## 🔧 Intégration dans NotaryForm.jsx

### 1. Importer les fonctions de tracking

```javascript
import {
  trackFormOpened,
  trackFormStart,
  trackScreenOpened,
  trackServiceSelected,
  trackServicesSelectionCompleted,
  trackDocumentScreenOpened,
  trackDocumentUploaded,
  trackDocumentsUploadCompleted,
  trackSignatoryScreenOpened,
  trackSignatoryAdded,
  trackSignatoriesCompleted,
  trackAppointmentScreenOpened,
  trackAppointmentBooked,
  trackPersonalInfoScreenOpened,
  trackPersonalInfoCompleted,
  trackSummaryScreenOpened,
  trackSummaryViewed,
  trackPaymentInitiated,
  trackPaymentCompleted
} from '../utils/analytics';
```

### 2. Track form_opened (première fois)

```javascript
useEffect(() => {
  // Track form opened only once per session
  const hasTrackedFormOpened = sessionStorage.getItem('form_opened_tracked');
  if (!hasTrackedFormOpened) {
    trackFormOpened();
    sessionStorage.setItem('form_opened_tracked', 'true');
  }
}, []);
```

### 3. Track form_start (quand l'utilisateur commence vraiment)

```javascript
useEffect(() => {
  // Track form start when user first interacts with step 1
  if (currentStep === 1 && formData.selectedServices.length === 0) {
    trackFormStart();
  }
}, [currentStep]);
```

### 4. Track screen_opened pour chaque étape

```javascript
useEffect(() => {
  // Track screen opened based on current step
  switch (currentStep) {
    case 1:
      trackScreenOpened('Choose Services', '/form/choose-services', 1);
      break;
    case 2:
      trackDocumentScreenOpened(formData.selectedServices?.length || 0);
      break;
    case 3:
      trackSignatoryScreenOpened();
      break;
    case 4:
      trackAppointmentScreenOpened();
      break;
    case 5:
      trackPersonalInfoScreenOpened();
      break;
    case 6:
      trackSummaryScreenOpened();
      break;
  }
}, [currentStep, location.pathname]);
```

### 5. Track service selection

Dans le composant `ChooseOption.jsx` ou là où les services sont sélectionnés :

```javascript
const handleServiceSelect = (serviceId, serviceName) => {
  // Update form data
  setFormData(prev => ({
    ...prev,
    selectedServices: [...prev.selectedServices, serviceId]
  }));
  
  // Track individual service selection
  trackServiceSelected(
    serviceId, 
    serviceName,
    formData.selectedServices.length + 1,
    [...formData.selectedServices, serviceId]
  );
};

const handleContinue = () => {
  // Track services selection completed
  trackServicesSelectionCompleted(formData.selectedServices);
  nextStep();
};
```

### 6. Track document upload

Dans le composant `Documents.jsx` :

```javascript
const handleDocumentUpload = (serviceId, files) => {
  // Update form data
  setFormData(prev => ({
    ...prev,
    serviceDocuments: {
      ...prev.serviceDocuments,
      [serviceId]: files
    }
  }));
  
  // Calculate totals
  const totalFiles = Object.values({
    ...formData.serviceDocuments,
    [serviceId]: files
  }).reduce((sum, docs) => sum + docs.length, 0);
  
  const servicesWithDocs = Object.keys({
    ...formData.serviceDocuments,
    [serviceId]: files
  }).filter(sId => {
    const docs = sId === serviceId ? files : formData.serviceDocuments[sId];
    return docs && docs.length > 0;
  }).length;
  
  // Track document upload
  trackDocumentUploaded(serviceId, files.length, totalFiles, servicesWithDocs);
};

const handleContinue = () => {
  // Calculate totals
  const totalFiles = Object.values(formData.serviceDocuments || {})
    .reduce((sum, docs) => sum + (docs?.length || 0), 0);
  const servicesWithDocs = Object.keys(formData.serviceDocuments || {})
    .filter(sId => formData.serviceDocuments[sId]?.length > 0).length;
  
  // Track documents upload completed
  trackDocumentsUploadCompleted(totalFiles, servicesWithDocs);
  nextStep();
};
```

### 7. Track signatories

Dans le composant `Signatories.jsx` :

```javascript
const handleSignatoryAdd = (signatory) => {
  // Update form data
  setFormData(prev => ({
    ...prev,
    signatories: [...prev.signatories, signatory]
  }));
  
  // Track signatory added
  trackSignatoryAdded(formData.signatories.length + 1);
};

const handleContinue = () => {
  // Track signatories completed
  trackSignatoriesCompleted(formData.signatories.length);
  nextStep();
};
```

### 8. Track appointment

Dans le composant `BookAppointment.jsx` :

```javascript
const handleAppointmentBook = (date, time, timezone) => {
  // Update form data
  setFormData(prev => ({
    ...prev,
    appointmentDate: date,
    appointmentTime: time,
    timezone: timezone
  }));
  
  // Track appointment booked
  trackAppointmentBooked(date, time, timezone);
  nextStep();
};
```

### 9. Track personal info

Dans le composant `PersonalInfo.jsx` :

```javascript
const handleContinue = () => {
  // Track personal info completed
  trackPersonalInfoCompleted(isAuthenticated);
  nextStep();
};
```

### 10. Track summary

Dans le composant `Summary.jsx` :

```javascript
useEffect(() => {
  // Track summary viewed
  const totalDocs = Object.values(formData.serviceDocuments || {})
    .reduce((sum, docs) => sum + (docs?.length || 0), 0);
  
  trackSummaryViewed({
    servicesCount: formData.selectedServices?.length || 0,
    documentsCount: totalDocs,
    signatoriesCount: formData.signatories?.length || 0,
    hasAppointment: !!(formData.appointmentDate && formData.appointmentTime)
  });
}, []);
```

### 11. Track payment

```javascript
const handlePaymentInitiate = async (amount, currency) => {
  // Track payment initiated
  trackPaymentInitiated(amount, currency);
  
  // ... payment logic
};

const handlePaymentSuccess = async (amount, currency, paymentId) => {
  // Track payment completed (purchase)
  trackPaymentCompleted(amount, currency, paymentId);
  
  // ... success logic
};
```

## 📈 Statistiques disponibles dans le Dashboard

Le funnel affiche maintenant :
- **Nombre de visiteurs** à chaque étape
- **Taux de conversion** entre les étapes
- **Taux d'abandon** avec nombre de visiteurs perdus
- **Statistiques détaillées** :
  - Moyenne de services sélectionnés
  - Total de documents uploadés
  - Nombre de signataires uniques
  - Liste des services les plus sélectionnés
  - Montants moyens pour les paiements

## 🎨 Catégories visuelles

- **Awareness** : Fond gris
- **Engagement** : Fond violet (écrans ouverts)
- **Conversion** : Fond bleu (actions complétées)
- **Conversion finale** : Fond vert (purchase)

## 💡 Optimisation de la conversion

Avec ces données détaillées, vous pouvez :
1. **Identifier les points d'abandon** : Voir où les utilisateurs quittent le funnel
2. **Analyser les écrans problématiques** : Comparer les écrans ouverts vs actions complétées
3. **Optimiser les étapes critiques** : Focus sur les étapes avec faible taux de conversion
4. **Comprendre les comportements** : Voir combien de services sont sélectionnés en moyenne
5. **Mesurer l'impact des changements** : Comparer les métriques avant/après optimisations


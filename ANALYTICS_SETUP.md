# Guide de configuration Analytics

Ce guide explique comment configurer et utiliser le système d'analytics pour tracker les données du formulaire.

## 📋 Prérequis

1. Avoir exécuté la migration SQL `supabase-analytics-migration.sql` dans Supabase
2. Avoir configuré les variables d'environnement Supabase dans le projet client-dashboard

## 🚀 Installation

### 1. Exécuter la migration SQL

Exécutez le fichier `supabase-analytics-migration.sql` dans l'éditeur SQL de Supabase pour créer la table `analytics_events`.

### 2. Intégrer le tracking dans le formulaire

Dans le composant `NotaryForm.jsx`, importez et utilisez les fonctions de tracking :

```javascript
import {
  trackPageView,
  trackFormStart,
  trackFormStep,
  trackFormSubmission,
  trackServiceSelected,
  trackDocumentUploaded,
  trackSignatoryAdded,
  trackAppointmentBooked,
  trackPersonalInfoCompleted,
  trackSummaryViewed,
  trackPaymentInitiated,
  trackPaymentCompleted
} from '../utils/analytics';
```

### 3. Ajouter les appels de tracking

#### Tracking des pages vues

```javascript
useEffect(() => {
  // Track pageview when component mounts or route changes
  trackPageView(location.pathname);
}, [location.pathname]);
```

#### Tracking du démarrage du formulaire

```javascript
useEffect(() => {
  // Track when user starts the form
  if (currentStep === 1) {
    trackFormStart();
  }
}, [currentStep]);
```

#### Tracking des étapes du formulaire

```javascript
const nextStep = () => {
  // Track step navigation
  trackFormStep(currentStep, steps[currentStep - 1].name, location.pathname);
  
  // ... rest of your navigation logic
};
```

#### Tracking des actions spécifiques

```javascript
// Quand un service est sélectionné
const handleServiceSelect = (serviceId) => {
  trackServiceSelected(serviceId, serviceName);
  // ... rest of your logic
};

// Quand des documents sont uploadés
const handleDocumentUpload = (serviceId, files) => {
  trackDocumentUploaded(serviceId, files.length);
  // ... rest of your logic
};

// Quand un signataire est ajouté
const handleSignatoryAdd = (signatories) => {
  trackSignatoryAdded(signatories.length);
  // ... rest of your logic
};

// Quand un rendez-vous est réservé
const handleAppointmentBook = (date, time, timezone) => {
  trackAppointmentBooked(date, time, timezone);
  // ... rest of your logic
};

// Quand les informations personnelles sont complétées
const handlePersonalInfoComplete = () => {
  trackPersonalInfoCompleted(isAuthenticated);
  // ... rest of your logic
};

// Quand le résumé est visualisé
useEffect(() => {
  if (currentStep === 6) {
    trackSummaryViewed({
      servicesCount: formData.selectedServices?.length || 0,
      documentsCount: totalDocuments,
      signatoriesCount: formData.signatories?.length || 0
    });
  }
}, [currentStep]);

// Quand le paiement est initié
const handlePaymentInitiate = (amount, currency) => {
  trackPaymentInitiated(amount, currency);
  // ... rest of your logic
};

// Quand le paiement est complété
const handlePaymentComplete = (amount, currency, paymentId) => {
  trackPaymentCompleted(amount, currency, paymentId);
  // ... rest of your logic
};
```

## 📊 Accéder aux Analytics

1. Connectez-vous au dashboard admin
2. Cliquez sur "Analytics" dans le menu de navigation
3. Vous verrez les différentes vues :
   - **Vue d'ensemble** : Métriques principales et graphique des visiteurs
   - **Pays** : Répartition des visiteurs par pays
   - **Appareils** : Répartition mobile/desktop
   - **Pages** : Pages les plus visitées

## 🔍 Données trackées

Le système track automatiquement :
- **Informations du visiteur** : ID unique, session ID
- **Informations géographiques** : Pays, ville, région (si disponibles)
- **Informations sur l'appareil** : Type (mobile/desktop/tablet), navigateur, OS, taille d'écran
- **Informations de trafic** : Referrer, paramètres UTM
- **Métadonnées** : Informations spécifiques à chaque événement

## 🎯 Événements disponibles

- `pageview` : Vue de page
- `form_start` : Démarrage du formulaire
- `form_step` : Navigation entre les étapes
- `form_submission` : Soumission du formulaire
- `form_abandonment` : Abandon du formulaire
- `service_selected` : Sélection d'un service
- `document_uploaded` : Upload de documents
- `signatory_added` : Ajout d'un signataire
- `appointment_booked` : Réservation d'un rendez-vous
- `personal_info_completed` : Complétion des informations personnelles
- `summary_viewed` : Visualisation du résumé
- `payment_initiated` : Initiation du paiement
- `payment_completed` : Paiement complété

## 🔒 Sécurité

- Les données sont stockées dans Supabase avec Row Level Security (RLS)
- Seuls les admins peuvent lire les données analytics
- Le public peut insérer des événements (nécessaire pour le tracking)
- Les données utilisateur sont anonymisées (visitor_id au lieu de données personnelles)

## 📝 Notes

- Le tracking fonctionne de manière asynchrone et n'affecte pas les performances du formulaire
- Les erreurs de tracking sont loggées dans la console mais n'interrompent pas le flux utilisateur
- Les données géographiques nécessitent un service de géolocalisation pour être complètes (actuellement simplifié)


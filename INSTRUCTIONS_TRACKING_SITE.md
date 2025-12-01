# Instructions pour intégrer le tracking analytics sur le site principal

## Contexte

Le tracking analytics est déjà intégré dans le formulaire (`/form`). Il faut maintenant l'intégrer sur toutes les pages du **site principal** (dashboard client, profil, messages, login, etc.) pour avoir une vue complète du parcours utilisateur.

## Objectif

Intégrer le tracking analytics sur toutes les pages du site principal pour :
- Suivre les visites sur chaque page
- Tracker les actions importantes (connexion, déconnexion, navigation, etc.)
- Avoir une vue complète du parcours utilisateur dans le dashboard Analytics

## Instructions détaillées

### 1. Tracking de pageview global sur toutes les routes

**Fichier à modifier :** `client-dashboard/src/App.jsx`

**Action :**
- Importer `useLocation` depuis `react-router-dom`
- Importer `trackPageView` depuis `./utils/analytics`
- Ajouter un `useEffect` qui track un `pageview` à chaque changement de route
- **Important :** Ne pas tracker les routes `/form/*` car elles sont déjà trackées dans `NotaryForm.jsx`

**Code à ajouter :**
```javascript
import { useLocation } from 'react-router-dom';
import { trackPageView } from './utils/analytics';

// Dans le composant App, avant le return
const location = useLocation();

useEffect(() => {
  // Track pageview for every route change, except form routes
  if (!location.pathname.startsWith('/form')) {
    trackPageView(location.pathname);
  }
}, [location]);
```

### 2. Tracker les actions sur le Dashboard

**Fichier à modifier :** `client-dashboard/src/pages/client/Dashboard.jsx`

**Actions à tracker :**

#### 2.1 Dashboard ouvert
- **Quand :** Au chargement du composant Dashboard
- **Événement :** `dashboard_viewed`
- **Métadonnées :** Nombre de soumissions totales

#### 2.2 Soumission ouverte
- **Quand :** Quand l'utilisateur clique sur une soumission pour voir les détails
- **Événement :** `submission_viewed`
- **Métadonnées :** `submission_id`, `submission_status`

#### 2.3 Soumission supprimée
- **Quand :** Quand l'utilisateur supprime une soumission
- **Événement :** `submission_deleted`
- **Métadonnées :** `submission_id`, `submission_status`

#### 2.4 Paiement relancé
- **Quand :** Quand l'utilisateur clique sur "Retry Payment"
- **Événement :** `payment_retried`
- **Métadonnées :** `submission_id`, `amount`

**Fonctions à créer dans `client-dashboard/src/utils/analytics.js` :**
```javascript
export const trackDashboardViewed = (totalSubmissions = 0) => {
  return trackEvent('dashboard_viewed', '/dashboard', {
    total_submissions: totalSubmissions,
    timestamp: new Date().toISOString()
  });
};

export const trackSubmissionViewed = (submissionId, status) => {
  return trackEvent('submission_viewed', '/dashboard', {
    submission_id: submissionId,
    submission_status: status,
    timestamp: new Date().toISOString()
  });
};

export const trackSubmissionDeleted = (submissionId, status) => {
  return trackEvent('submission_deleted', '/dashboard', {
    submission_id: submissionId,
    submission_status: status,
    timestamp: new Date().toISOString()
  });
};

export const trackPaymentRetried = (submissionId, amount) => {
  return trackEvent('payment_retried', '/dashboard', {
    submission_id: submissionId,
    amount: amount,
    timestamp: new Date().toISOString()
  });
};
```

**Intégration dans Dashboard.jsx :**
- Appeler `trackDashboardViewed(stats.total)` dans un `useEffect` au chargement
- Appeler `trackSubmissionViewed(submission.id, submission.status)` quand l'utilisateur clique sur une soumission
- Appeler `trackSubmissionDeleted(submission.id, submission.status)` dans la fonction `handleDelete`
- Appeler `trackPaymentRetried(submission.id, amount)` dans la fonction `retryPayment`

### 3. Tracker les actions sur la page Détails de soumission

**Fichier à modifier :** `client-dashboard/src/pages/client/SubmissionDetail.jsx`

**Actions à tracker :**

#### 3.1 Page de détails ouverte
- **Quand :** Au chargement de la page
- **Événement :** `submission_detail_viewed`
- **Métadonnées :** `submission_id`, `submission_status`

**Fonction à créer dans `analytics.js` :**
```javascript
export const trackSubmissionDetailViewed = (submissionId, status) => {
  return trackEvent('submission_detail_viewed', `/submission/${submissionId}`, {
    submission_id: submissionId,
    submission_status: status,
    timestamp: new Date().toISOString()
  });
};
```

### 4. Tracker les actions sur la page Profil

**Fichier à modifier :** `client-dashboard/src/pages/client/Profile.jsx`

**Actions à tracker :**

#### 4.1 Profil ouvert
- **Quand :** Au chargement de la page profil
- **Événement :** `profile_viewed`

#### 4.2 Profil mis à jour
- **Quand :** Quand l'utilisateur met à jour ses informations avec succès
- **Événement :** `profile_updated`
- **Métadonnées :** Liste des champs modifiés (`fields_updated`)

#### 4.3 Mot de passe changé
- **Quand :** Quand l'utilisateur change son mot de passe avec succès
- **Événement :** `password_changed`

**Fonctions à créer dans `analytics.js` :**
```javascript
export const trackProfileViewed = () => {
  return trackEvent('profile_viewed', '/profile', {
    timestamp: new Date().toISOString()
  });
};

export const trackProfileUpdated = (fieldsUpdated = []) => {
  return trackEvent('profile_updated', '/profile', {
    fields_updated: fieldsUpdated,
    timestamp: new Date().toISOString()
  });
};

export const trackPasswordChanged = () => {
  return trackEvent('password_changed', '/profile', {
    timestamp: new Date().toISOString()
  });
};
```

**Intégration dans Profile.jsx :**
- Appeler `trackProfileViewed()` dans un `useEffect` au chargement
- Appeler `trackProfileUpdated(fieldsUpdated)` après une mise à jour réussie
- Appeler `trackPasswordChanged()` après un changement de mot de passe réussi

### 5. Tracker les actions sur la page Messages

**Fichier à modifier :** `client-dashboard/src/pages/client/Messages.jsx`

**Actions à tracker :**

#### 5.1 Messages ouverts
- **Quand :** Au chargement de la page messages
- **Événement :** `messages_viewed`
- **Métadonnées :** Nombre de conversations (`conversations_count`)

#### 5.2 Conversation ouverte
- **Quand :** Quand l'utilisateur ouvre une conversation
- **Événement :** `conversation_opened`
- **Métadonnées :** `conversation_id`, `submission_id` (si lié à une soumission)

#### 5.3 Message envoyé
- **Quand :** Quand l'utilisateur envoie un message
- **Événement :** `message_sent`
- **Métadonnées :** `conversation_id`, `submission_id` (si lié), `message_length`

**Fonctions à créer dans `analytics.js` :**
```javascript
export const trackMessagesViewed = (conversationsCount = 0) => {
  return trackEvent('messages_viewed', '/messages', {
    conversations_count: conversationsCount,
    timestamp: new Date().toISOString()
  });
};

export const trackConversationOpened = (conversationId, submissionId = null) => {
  return trackEvent('conversation_opened', '/messages', {
    conversation_id: conversationId,
    submission_id: submissionId,
    timestamp: new Date().toISOString()
  });
};

export const trackMessageSent = (conversationId, submissionId = null, messageLength = 0) => {
  return trackEvent('message_sent', '/messages', {
    conversation_id: conversationId,
    submission_id: submissionId,
    message_length: messageLength,
    timestamp: new Date().toISOString()
  });
};
```

**Intégration dans Messages.jsx :**
- Appeler `trackMessagesViewed(conversations.length)` dans un `useEffect` au chargement
- Appeler `trackConversationOpened(conversationId, submissionId)` quand une conversation est sélectionnée
- Appeler `trackMessageSent(conversationId, submissionId, message.length)` après l'envoi d'un message

### 6. Tracker les actions sur la page Login

**Fichier à modifier :** `client-dashboard/src/pages/client/Login.jsx`

**Actions à tracker :**

#### 6.1 Page login ouverte
- **Quand :** Au chargement de la page login
- **Événement :** `login_page_viewed`

#### 6.2 Tentative de connexion
- **Quand :** Quand l'utilisateur clique sur "Se connecter"
- **Événement :** `login_attempted`

#### 6.3 Connexion réussie
- **Quand :** Quand l'utilisateur se connecte avec succès
- **Événement :** `login_success`
- **Métadonnées :** Méthode de connexion (`login_method`: 'email' ou 'magic_link')

#### 6.4 Connexion échouée
- **Quand :** Quand la connexion échoue
- **Événement :** `login_failed`
- **Métadonnées :** `error_message`

#### 6.5 Lien de réinitialisation demandé
- **Quand :** Quand l'utilisateur demande un reset de mot de passe
- **Événement :** `password_reset_requested`

**Fonctions à créer dans `analytics.js` :**
```javascript
export const trackLoginPageViewed = () => {
  return trackEvent('login_page_viewed', '/login', {
    timestamp: new Date().toISOString()
  });
};

export const trackLoginAttempted = () => {
  return trackEvent('login_attempted', '/login', {
    timestamp: new Date().toISOString()
  });
};

export const trackLoginSuccess = (loginMethod = 'email') => {
  return trackEvent('login_success', '/login', {
    login_method: loginMethod,
    timestamp: new Date().toISOString()
  });
};

export const trackLoginFailed = (errorMessage) => {
  return trackEvent('login_failed', '/login', {
    error_message: errorMessage,
    timestamp: new Date().toISOString()
  });
};

export const trackPasswordResetRequested = () => {
  return trackEvent('password_reset_requested', '/login', {
    timestamp: new Date().toISOString()
  });
};
```

**Intégration dans Login.jsx :**
- Appeler `trackLoginPageViewed()` dans un `useEffect` au chargement
- Appeler `trackLoginAttempted()` au début de la fonction de connexion
- Appeler `trackLoginSuccess('email')` ou `trackLoginSuccess('magic_link')` après connexion réussie
- Appeler `trackLoginFailed(error.message)` en cas d'erreur
- Appeler `trackPasswordResetRequested()` quand l'utilisateur demande un reset

### 7. Tracker les actions sur ResetPassword

**Fichier à modifier :** `client-dashboard/src/pages/client/ResetPassword.jsx`

**Actions à tracker :**

#### 7.1 Page reset ouverte
- **Quand :** Au chargement de la page
- **Événement :** `password_reset_page_viewed`

#### 7.2 Mot de passe réinitialisé
- **Quand :** Quand l'utilisateur réinitialise son mot de passe avec succès
- **Événement :** `password_reset_completed`

**Fonctions à créer dans `analytics.js` :**
```javascript
export const trackPasswordResetPageViewed = () => {
  return trackEvent('password_reset_page_viewed', '/auth/reset-password', {
    timestamp: new Date().toISOString()
  });
};

export const trackPasswordResetCompleted = () => {
  return trackEvent('password_reset_completed', '/auth/reset-password', {
    timestamp: new Date().toISOString()
  });
};
```

### 8. Tracker les actions sur PaymentSuccess

**Fichier à modifier :** `client-dashboard/src/pages/PaymentSuccess.jsx`

**Actions à tracker :**

#### 8.1 Page de succès ouverte
- **Quand :** Au chargement de la page
- **Événement :** `payment_success_page_viewed`
- **Métadonnées :** `submission_id`, `amount`

**Note :** L'événement `purchase` est déjà tracké dans ce fichier, vérifier qu'il fonctionne correctement.

**Fonction à créer dans `analytics.js` :**
```javascript
export const trackPaymentSuccessPageViewed = (submissionId, amount) => {
  return trackEvent('payment_success_page_viewed', '/payment/success', {
    submission_id: submissionId,
    amount: amount,
    timestamp: new Date().toISOString()
  });
};
```

### 9. Tracker les actions sur PaymentFailed

**Fichier à modifier :** `client-dashboard/src/pages/PaymentFailed.jsx`

**Actions à tracker :**

#### 9.1 Page d'échec ouverte
- **Quand :** Au chargement de la page
- **Événement :** `payment_failed_page_viewed`

#### 9.2 Nouvelle tentative de paiement
- **Quand :** Quand l'utilisateur clique sur "Retry Payment"
- **Événement :** `payment_retry_from_failed`

**Fonctions à créer dans `analytics.js` :**
```javascript
export const trackPaymentFailedPageViewed = () => {
  return trackEvent('payment_failed_page_viewed', '/payment/failed', {
    timestamp: new Date().toISOString()
  });
};

export const trackPaymentRetryFromFailed = () => {
  return trackEvent('payment_retry_from_failed', '/payment/failed', {
    timestamp: new Date().toISOString()
  });
};
```

### 10. Tracker la déconnexion

**Fichier à modifier :** `client-dashboard/src/components/ClientLayout.jsx`

**Actions à tracker :**

#### 10.1 Déconnexion
- **Quand :** Quand l'utilisateur clique sur "Logout" et se déconnecte
- **Événement :** `logout`

**Fonction à créer dans `analytics.js` :**
```javascript
export const trackLogout = () => {
  return trackEvent('logout', window.location.pathname, {
    timestamp: new Date().toISOString()
  });
};
```

**Intégration dans ClientLayout.jsx :**
- Trouver la fonction `handleLogout` ou équivalent
- Appeler `trackLogout()` avant ou après la déconnexion

### 11. Tracker les interactions avec le chat Crisp (optionnel)

**Fichier à modifier :** `client-dashboard/src/utils/crisp.js` ou dans les composants qui utilisent Crisp

**Actions à tracker :**

#### 11.1 Chat ouvert
- **Quand :** Quand l'utilisateur ouvre le chat Crisp
- **Événement :** `chat_opened`

**Fonction à créer dans `analytics.js` :**
```javascript
export const trackChatOpened = () => {
  return trackEvent('chat_opened', window.location.pathname, {
    timestamp: new Date().toISOString()
  });
};
```

**Note :** Pour tracker l'ouverture du chat, il faudra utiliser les événements Crisp ou ajouter un listener sur le bouton d'ouverture du chat.

## Checklist d'intégration

- [ ] **App.jsx** : Ajouter le tracking de pageview global (sauf routes `/form/*`)
- [ ] **analytics.js** : Créer toutes les fonctions de tracking listées ci-dessus
- [ ] **Dashboard.jsx** : Intégrer le tracking (dashboard_viewed, submission_viewed, submission_deleted, payment_retried)
- [ ] **SubmissionDetail.jsx** : Intégrer le tracking (submission_detail_viewed)
- [ ] **Profile.jsx** : Intégrer le tracking (profile_viewed, profile_updated, password_changed)
- [ ] **Messages.jsx** : Intégrer le tracking (messages_viewed, conversation_opened, message_sent)
- [ ] **Login.jsx** : Intégrer le tracking (login_page_viewed, login_attempted, login_success, login_failed, password_reset_requested)
- [ ] **ResetPassword.jsx** : Intégrer le tracking (password_reset_page_viewed, password_reset_completed)
- [ ] **PaymentSuccess.jsx** : Vérifier/ajouter le tracking (payment_success_page_viewed)
- [ ] **PaymentFailed.jsx** : Intégrer le tracking (payment_failed_page_viewed, payment_retry_from_failed)
- [ ] **ClientLayout.jsx** : Intégrer le tracking de déconnexion (logout)
- [ ] **Tester** : Vérifier que tous les événements sont bien trackés dans Supabase

## Notes importantes

1. **Ne pas tracker les routes `/form/*`** : Ces routes sont déjà trackées dans `NotaryForm.jsx`
2. **Utiliser `trackEvent`** : Toutes les fonctions doivent utiliser `trackEvent` de `analytics.js`
3. **Inclure les métadonnées** : Ajouter des métadonnées pertinentes (IDs, statuts, montants, etc.) pour faciliter l'analyse
4. **Ne pas bloquer l'UX** : Le tracking ne doit jamais bloquer les actions utilisateur, utiliser `async/await` sans `await` si nécessaire
5. **Gérer les erreurs** : Le tracking ne doit pas faire échouer les actions principales, utiliser try/catch si nécessaire

## Vérification

Après intégration, vérifier dans Supabase Dashboard > Table Editor > analytics_events que :
- Les événements `pageview` sont trackés pour chaque page (sauf `/form/*`)
- Les événements spécifiques sont trackés aux bons moments
- Les métadonnées sont bien remplies
- Les données apparaissent dans le dashboard Analytics admin

## Exemple d'intégration complète

Voici un exemple pour Dashboard.jsx :

```javascript
import { trackDashboardViewed, trackSubmissionViewed, trackSubmissionDeleted, trackPaymentRetried } from '../../utils/analytics';

// Dans le composant Dashboard
useEffect(() => {
  if (!loading && clientInfo) {
    trackDashboardViewed(stats.total);
  }
}, [loading, clientInfo, stats.total]);

// Dans la fonction qui gère le clic sur une soumission
const handleSubmissionClick = (submission) => {
  trackSubmissionViewed(submission.id, submission.status);
  navigate(`/submission/${submission.id}`);
};

// Dans la fonction handleDelete
const handleDelete = async (submission) => {
  // ... code de suppression ...
  trackSubmissionDeleted(submission.id, submission.status);
};

// Dans la fonction retryPayment
const retryPayment = async (submission) => {
  // ... code de retry ...
  trackPaymentRetried(submission.id, amount);
};
```

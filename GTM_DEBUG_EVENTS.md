# Guide de débogage - Événements GTM non déclenchés

## 🔍 Problème identifié

Les balises GTM pour les événements personnalisés ne se déclenchent pas, même après avoir complété tout le parcours utilisateur.

## ✅ Vérifications à effectuer

### 1. Vérifier que les événements sont bien envoyés au dataLayer

#### Dans la console du navigateur (F12)

1. Ouvrez la console du navigateur (F12)
2. Tapez dans la console :
```javascript
// Vérifier que dataLayer existe
console.log('dataLayer:', window.dataLayer);

// Voir tous les événements envoyés
window.dataLayer.forEach((item, index) => {
  if (item.event) {
    console.log(`Event ${index}:`, item.event, item);
  }
});
```

3. **Vérifiez que vous voyez ces événements** :
   - `form_start`
   - `form_step_completed`
   - `begin_checkout`
   - `form_submission_start`
   - `form_submit`

#### Dans GTM Debug Mode

1. Dans GTM Debug Mode, cliquez sur l'onglet **"Couche de données"** (Data Layer)
2. Vérifiez que les événements apparaissent dans la liste
3. Cliquez sur chaque événement pour voir ses données

---

### 2. Vérifier la configuration des déclencheurs dans GTM

#### Pour chaque balise non déclenchée, vérifiez :

1. **Ouvrez la balise** (ex: "Google Ads - Conversion form start")
2. **Vérifiez la section "Déclenchement"** :
   - Le déclencheur doit être de type **"Événement personnalisé"**
   - Le nom de l'événement doit correspondre **EXACTEMENT** au nom envoyé dans le code

#### Noms d'événements attendus :

| Événement dans le code | Nom du déclencheur dans GTM |
|------------------------|----------------------------|
| `form_start` | `form_start` |
| `form_step_completed` | `form_step_completed` |
| `begin_checkout` | `begin_checkout` |
| `form_submission_start` | `form_submission_start` |
| `form_submit` | `form_submit` |

⚠️ **IMPORTANT** : Le nom doit être **EXACTEMENT** identique (sensible à la casse, pas d'espaces supplémentaires)

---

### 3. Vérifier que le code s'exécute sur la bonne page

#### Problème potentiel : Le code est dans `src/` mais vous testez sur `client-dashboard/`

**Vérification** :

1. Vérifiez quelle URL vous utilisez pour tester :
   - Si vous testez sur `client-dashboard` → Le code doit être dans `client-dashboard/src/utils/gtm.js`
   - Si vous testez sur le formulaire principal → Le code doit être dans `src/utils/gtm.js`

2. **Vérifiez les imports dans les composants** :
   - Dans `client-dashboard/src/components/NotaryForm.jsx`, vérifiez que les imports pointent vers `../utils/gtm`

---

### 4. Vérifier que GTM est bien initialisé

#### Dans la console du navigateur :

```javascript
// Vérifier que GTM est chargé
console.log('GTM Container:', window.google_tag_manager);
console.log('dataLayer exists:', typeof window.dataLayer !== 'undefined');
console.log('dataLayer length:', window.dataLayer?.length || 0);
```

---

### 5. Test manuel des événements

#### Testez chaque événement manuellement dans la console :

```javascript
// Test form_start
window.dataLayer.push({
  event: 'form_start',
  form_name: 'notarization_form',
  service_type: 'Document Notarization',
  cta_location: 'homepage_hero',
  cta_text: 'Commencer ma notarisation'
});

// Test form_step_completed
window.dataLayer.push({
  event: 'form_step_completed',
  step_number: 1,
  step_name: 'document_upload'
});

// Test begin_checkout
window.dataLayer.push({
  event: 'begin_checkout',
  currency: 'USD',
  value: 75,
  items: [{
    item_id: 'notary_standard',
    item_name: 'Document Notarization',
    item_category: 'Notarization Service',
    price: 75,
    quantity: 1
  }]
});
```

**Après chaque test**, vérifiez dans GTM Debug Mode si la balise correspondante se déclenche.

---

## 🔧 Solutions possibles

### Solution 1 : Vérifier que le code est bien déployé

Si vous testez sur `client-dashboard`, assurez-vous que :
1. Le code a été modifié dans `client-dashboard/src/utils/gtm.js`
2. Le build a été relancé
3. La page a été rechargée complètement (Ctrl+F5)

### Solution 2 : Vérifier les déclencheurs dans GTM

Pour chaque balise non déclenchée :

1. **Ouvrez la balise**
2. **Cliquez sur "Déclenchement"**
3. **Vérifiez que le déclencheur est de type "Événement personnalisé"**
4. **Vérifiez que le nom de l'événement correspond EXACTEMENT**

Exemple pour `form_start` :
- Type : **Événement personnalisé**
- Nom de l'événement : **`form_start`** (exactement, sans espaces)

### Solution 3 : Vérifier que les fonctions sont bien appelées

#### Dans la console du navigateur, ajoutez des logs :

Modifiez temporairement `src/utils/gtm.js` ou `client-dashboard/src/utils/gtm.js` :

```javascript
export const pushGTMEvent = (eventName, eventData = {}) => {
  if (typeof window === 'undefined' || !window.dataLayer) {
    console.error('❌ [GTM] dataLayer not initialized');
    return;
  }

  const eventPayload = {
    event: eventName,
    event_name: eventName,
    ...eventData
  };

  // Push to dataLayer
  window.dataLayer.push(eventPayload);

  // Debug log TOUJOURS actif (même en production pour debug)
  console.log('📊 [GTM] Event pushed to dataLayer:', eventPayload);
  console.log('📊 [GTM] dataLayer length:', window.dataLayer.length);
};
```

### Solution 4 : Vérifier les conditions dans le code

#### Pour `form_start` :

Le code vérifie `completedSteps.length === 0`. Si l'utilisateur a déjà des étapes complétées dans le localStorage, l'événement ne se déclenchera pas.

**Test** :
```javascript
// Dans la console, vérifiez le localStorage
console.log('Completed steps:', localStorage.getItem('notaryCompletedSteps'));
```

Si vous voyez des données, videz le localStorage :
```javascript
localStorage.removeItem('notaryCompletedSteps');
localStorage.removeItem('notaryFormData');
```

Puis rechargez la page.

---

## 📋 Checklist de débogage

- [ ] Les événements apparaissent dans `window.dataLayer` (console navigateur)
- [ ] Les événements apparaissent dans GTM Debug Mode > Couche de données
- [ ] Les déclencheurs sont de type "Événement personnalisé"
- [ ] Les noms des déclencheurs correspondent EXACTEMENT aux noms dans le code
- [ ] Le code est dans le bon dossier (`src/` vs `client-dashboard/src/`)
- [ ] Le build a été relancé après les modifications
- [ ] La page a été rechargée complètement (Ctrl+F5)
- [ ] Le localStorage ne contient pas de données anciennes qui bloquent `form_start`

---

## 🎯 Test rapide

Exécutez ce script dans la console du navigateur pour tester tous les événements :

```javascript
// Test tous les événements
const testEvents = [
  {
    event: 'form_start',
    form_name: 'notarization_form',
    service_type: 'Document Notarization',
    cta_location: 'homepage_hero',
    cta_text: 'Commencer ma notarisation'
  },
  {
    event: 'form_step_completed',
    step_number: 1,
    step_name: 'document_upload'
  },
  {
    event: 'begin_checkout',
    currency: 'USD',
    value: 75,
    items: [{
      item_id: 'notary_standard',
      item_name: 'Document Notarization',
      item_category: 'Notarization Service',
      price: 75,
      quantity: 1
    }]
  },
  {
    event: 'form_submission_start',
    form_type: 'notary_service',
    options_count: 2,
    documents_count: 3
  },
  {
    event: 'form_submit',
    form_type: 'notary_service',
    submission_id: 'test-123',
    options_count: 2,
    documents_count: 3
  }
];

testEvents.forEach((eventData, index) => {
  setTimeout(() => {
    console.log(`Testing event ${index + 1}:`, eventData.event);
    window.dataLayer.push(eventData);
  }, index * 1000);
});
```

**Après avoir exécuté ce script**, vérifiez dans GTM Debug Mode si toutes les balises se déclenchent.

---

## 🚨 Problème le plus probable

**Les déclencheurs ne sont pas correctement configurés dans GTM.**

Vérifiez que pour chaque balise :
1. Le déclencheur est de type **"Événement personnalisé"**
2. Le nom de l'événement correspond **EXACTEMENT** (pas de différences de casse, pas d'espaces)


# 🎯 Configuration Plausible Funnels - Guide Complet

## 📋 Événements Trackés dans le Code

Voici la liste exacte des événements trackés avec leurs noms et propriétés :

### 1. `form_started` - Début du formulaire
**Fichier** : `src/utils/plausible.js` ligne 178
**Appelé dans** : `NotaryForm.jsx` lignes 360, 411
**Propriétés** :
```javascript
{
  funnel_step: '1_form_started'
}
```

### 2. `services_selected` - Services sélectionnés
**Fichier** : `src/utils/plausible.js` ligne 189
**Appelé dans** : `NotaryForm.jsx` ligne 606
**Propriétés** :
```javascript
{
  funnel_step: '2_services_selected',
  services_count: number,
  service_ids: string (comma-separated)
}
```

### 3. `documents_uploaded` - Documents uploadés
**Fichier** : `src/utils/plausible.js` ligne 202
**Appelé dans** : `NotaryForm.jsx` ligne 631
**Propriétés** :
```javascript
{
  funnel_step: '3_documents_uploaded',
  documents_count: number,
  services_with_docs: number
}
```

### 4. `signatories_added` - Signataires ajoutés
**Fichier** : `src/utils/plausible.js` ligne 214
**Appelé dans** : `NotaryForm.jsx` ligne 642
**Propriétés** :
```javascript
{
  funnel_step: '4_signatories_added',
  signatories_count: number
}
```

### 5. `appointment_booked` - Rendez-vous réservé
**Fichier** : `src/utils/plausible.js` ligne 227
**Appelé dans** : `NotaryForm.jsx` ligne 656
**Propriétés** :
```javascript
{
  funnel_step: '5_appointment_booked',
  appointment_date: string,
  appointment_time: string,
  timezone: string
}
```

### 6. `personal_info_completed` - Informations personnelles complétées
**Fichier** : `src/utils/plausible.js` ligne 240
**Appelé dans** : `NotaryForm.jsx` ligne 672
**Propriétés** :
```javascript
{
  funnel_step: '6_personal_info_completed',
  is_authenticated: boolean
}
```

### 7. `summary_viewed` - Résumé consulté
**Fichier** : `src/utils/plausible.js` ligne 251
**Appelé dans** : `NotaryForm.jsx` ligne 706
**Propriétés** :
```javascript
{
  funnel_step: '7_summary_viewed',
  total_services: number,
  total_documents: number,
  total_signatories: number,
  has_appointment: boolean
}
```

### 8. `payment_initiated` - Paiement initié
**Fichier** : `src/utils/plausible.js` ligne 265
**Appelé dans** : `NotaryForm.jsx` ligne 1097
**Propriétés** :
```javascript
{
  funnel_step: '8_payment_initiated',
  total_amount: number,
  services_count: number,
  currency: string
}
```

### 9. `payment_completed` - Paiement complété (CONVERSION)
**Fichier** : `src/utils/plausible.js` ligne 278
**Appelé dans** : `PaymentSuccess.jsx` ligne 57
**Propriétés** :
```javascript
{
  funnel_step: '9_payment_completed',
  transaction_id: string,
  total_amount: number,
  submission_id: string,
  currency: string
}
```

## 🔧 Configuration dans Plausible Dashboard

### Étape 1 : Créer les Goals (Événements)

1. Allez dans votre **Plausible Dashboard** → **Settings** → **Goals**
2. Créez les goals suivants avec ces noms **EXACTS** :

```
form_started
services_selected
documents_uploaded
signatories_added
appointment_booked
personal_info_completed
summary_viewed
payment_initiated
payment_completed
```

⚠️ **IMPORTANT** : Les noms doivent être **exactement** comme ci-dessus (minuscules, underscores).

### Étape 2 : Créer le Funnel

1. Allez dans **Dashboard** → **Funnels**
2. Cliquez sur **Create Funnel**
3. Nommez-le : "Notarization Form Conversion"
4. Ajoutez les étapes dans cet ordre :

```
1. form_started
2. services_selected
3. documents_uploaded
4. signatories_added
5. appointment_booked
6. personal_info_completed
7. summary_viewed
8. payment_initiated
9. payment_completed
```

### Étape 3 : Vérifier les Événements

Pour vérifier que les événements sont bien trackés :

1. Allez dans **Dashboard** → **Goals**
2. Cliquez sur un goal (ex: `form_started`)
3. Vous devriez voir les événements apparaître en temps réel

## 🐛 Dépannage

### Les événements n'apparaissent pas dans Plausible

1. **Vérifiez la console du navigateur** :
   - Ouvrez la console (F12)
   - Cherchez les logs `[Plausible]`
   - Vérifiez s'il y a des erreurs

2. **Vérifiez que Plausible n'est pas bloqué** :
   - Le code détecte automatiquement les bloqueurs de pub
   - Si bloqué, les événements sont envoyés à Supabase en fallback
   - Vérifiez les logs : `⚠️ [Plausible] Script not loaded`

3. **Vérifiez les noms d'événements** :
   - Les noms doivent correspondre **exactement** entre le code et Plausible
   - Vérifiez la casse (minuscules)
   - Vérifiez les underscores vs tirets

4. **Vérifiez le domaine** :
   - Dans `index.html`, vérifiez que `data-domain="mynotary.io"` correspond à votre domaine Plausible

### Les événements apparaissent mais pas dans le funnel

1. **Vérifiez l'ordre des étapes** :
   - Les étapes doivent être dans le bon ordre dans Plausible
   - Un utilisateur doit compléter les étapes dans l'ordre

2. **Vérifiez les propriétés** :
   - Les propriétés `funnel_step` sont envoyées mais ne sont pas nécessaires pour le funnel
   - Le funnel utilise uniquement les noms d'événements

3. **Vérifiez le timing** :
   - Les événements doivent être envoyés avant la navigation
   - Le code utilise `await` pour s'assurer que les événements sont envoyés

## ✅ Checklist de Configuration

- [ ] Tous les 9 goals sont créés dans Plausible avec les bons noms
- [ ] Le funnel est créé avec les 9 étapes dans le bon ordre
- [ ] Le domaine dans `index.html` correspond à votre domaine Plausible
- [ ] Les événements apparaissent dans "Goals" → "form_started" (test)
- [ ] Le funnel affiche des données après quelques conversions

## 📊 Test du Funnel

Pour tester le funnel :

1. Remplissez le formulaire complètement
2. Complétez le paiement
3. Attendez quelques secondes
4. Vérifiez dans Plausible → Funnels
5. Vous devriez voir 1 conversion complète

## 🔍 Vérification en Temps Réel

Pour voir les événements en temps réel :

1. Ouvrez la console du navigateur (F12)
2. Remplissez le formulaire
3. Vous devriez voir les logs :
   - `✅ [Plausible] Event tracked: form_started`
   - `✅ [Plausible] Event tracked: services_selected`
   - etc.

Si vous voyez `⚠️ [Plausible] Using Supabase fallback`, cela signifie que Plausible est bloqué par un ad blocker, mais les événements sont quand même sauvegardés dans Supabase.




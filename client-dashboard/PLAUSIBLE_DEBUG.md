# 🐛 Debug Plausible Funnels

## ✅ Vérifications à Faire

### 1. Vérifier les Noms d'Événements

Les noms d'événements dans le code doivent correspondre **EXACTEMENT** aux goals dans Plausible :

**Dans le code** (`src/utils/plausible.js`) :
- `form_started` ✅
- `services_selected` ✅
- `documents_uploaded` ✅
- `signatories_added` ✅
- `appointment_booked` ✅
- `personal_info_completed` ✅
- `summary_viewed` ✅
- `payment_initiated` ✅
- `payment_completed` ✅

**Dans Plausible Dashboard** :
- Allez dans **Settings** → **Goals**
- Vérifiez que ces 9 goals existent avec ces noms **EXACTS**

### 2. Vérifier la Console du Navigateur

Ouvrez la console (F12) et remplissez le formulaire. Vous devriez voir :

```
✅ [Plausible] Event tracked: form_started
✅ [Plausible] Event tracked: services_selected {funnel_step: '2_services_selected', ...}
✅ [Plausible] Event tracked: documents_uploaded {funnel_step: '3_documents_uploaded', ...}
...
```

Si vous voyez `⚠️ [Plausible] Using Supabase fallback`, Plausible est bloqué par un ad blocker.

### 3. Vérifier dans Plausible Dashboard

1. Allez dans **Dashboard** → **Goals**
2. Cliquez sur `form_started`
3. Vous devriez voir les événements apparaître en temps réel

### 4. Vérifier le Funnel

1. Allez dans **Dashboard** → **Funnels**
2. Sélectionnez votre funnel "Notarization Form Conversion"
3. Vérifiez que les étapes sont dans le bon ordre :
   ```
   1. form_started
   2. services_selected
   3. documents_uploaded
   4. signatories_added
   ...
   ```

## 🔍 Test Manuel

Pour tester manuellement, ouvrez la console et tapez :

```javascript
// Test 1: Vérifier que Plausible est chargé
console.log('Plausible disponible:', typeof window.plausible === 'function');

// Test 2: Envoyer un événement de test
window.plausible('test_event', { props: { test: true } });

// Test 3: Vérifier les événements du funnel
window.plausible('form_started');
window.plausible('services_selected', { props: { services_count: 1 } });
```

Puis vérifiez dans Plausible → Goals → `test_event` si l'événement apparaît.

## 🚨 Problèmes Courants

### Problème 1 : Les événements n'apparaissent pas du tout

**Cause** : Plausible est bloqué par un ad blocker
**Solution** : 
- Désactivez temporairement l'ad blocker pour tester
- Les événements sont quand même sauvegardés dans Supabase (fallback)

### Problème 2 : Les événements apparaissent mais pas dans le funnel

**Cause** : Les noms d'événements ne correspondent pas
**Solution** :
- Vérifiez que les noms dans Plausible Goals sont **exactement** les mêmes que dans le code
- Vérifiez la casse (minuscules uniquement)
- Vérifiez les underscores vs tirets

### Problème 3 : Le funnel montre 0% de conversion

**Cause** : Les utilisateurs ne complètent pas toutes les étapes dans l'ordre
**Solution** :
- C'est normal si les utilisateurs abandonnent le formulaire
- Le funnel montre le taux d'abandon à chaque étape
- Vérifiez que `payment_completed` est bien tracké après le paiement

### Problème 4 : Les événements apparaissent en double

**Cause** : Le code envoie à la fois Plausible et Supabase
**Solution** :
- C'est normal, c'est le système de fallback
- Les événements Supabase sont sauvegardés en backup
- Seuls les événements Plausible apparaissent dans le funnel

## 📊 Vérification du Funnel

Pour vérifier que le funnel fonctionne :

1. **Remplissez le formulaire complètement** :
   - Sélectionnez un service
   - Uploadez des documents
   - Ajoutez des signataires
   - Réservez un rendez-vous
   - Remplissez les infos personnelles
   - Consultez le résumé
   - Initiez le paiement
   - Complétez le paiement

2. **Attendez 1-2 minutes** (Plausible peut avoir un léger délai)

3. **Vérifiez dans Plausible** :
   - Dashboard → Funnels → Votre funnel
   - Vous devriez voir 1 conversion complète (100%)

## 🔧 Correction des Noms d'Événements

Si les noms ne correspondent pas, vous avez deux options :

### Option 1 : Modifier les Goals dans Plausible (Recommandé)
- Allez dans Settings → Goals
- Renommez les goals pour correspondre au code

### Option 2 : Modifier le Code
- Modifiez les noms dans `src/utils/plausible.js`
- Par exemple, changez `form_started` en `Form Started` si c'est ce que vous avez dans Plausible

## 📝 Checklist de Debug

- [ ] Console du navigateur ouverte (F12)
- [ ] Formulaire rempli complètement
- [ ] Logs `✅ [Plausible] Event tracked:` visibles dans la console
- [ ] Goals créés dans Plausible avec les bons noms
- [ ] Funnel créé avec les 9 étapes dans le bon ordre
- [ ] Événements visibles dans Plausible → Goals
- [ ] Funnel affiche des données après conversion complète





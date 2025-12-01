# 🔧 Correction du Funnel Plausible

## ❌ Problème Identifié

Dans votre configuration Plausible, il manque l'étape `payment_initiated` !

**Funnel actuel** (8 étapes) :
1. `form_started` ✅
2. `services_selected` ✅
3. `documents_uploaded` ✅
4. `signatories_added` ✅
5. `appointment_booked` ✅
6. `personal_info_completed` ✅
7. `summary_viewed` ✅
8. `payment_completed` ❌ **MANQUE `payment_initiated` AVANT !**

**Funnel correct** (9 étapes) :
1. `form_started`
2. `services_selected`
3. `documents_uploaded`
4. `signatories_added`
5. `appointment_booked`
6. `personal_info_completed`
7. `summary_viewed`
8. `payment_initiated` ⚠️ **MANQUANT !**
9. `payment_completed`

## ✅ Solution

### Étape 1 : Ajouter `payment_initiated` dans le Funnel

1. Dans Plausible Dashboard → **Settings** → **Funnels**
2. Cliquez sur "Edit funnel" pour votre funnel "Form Conversion Funnel"
3. **Ajoutez une nouvelle étape** entre `summary_viewed` et `payment_completed`
4. Nommez-la : `payment_initiated`
5. Cliquez sur "Update funnel"

### Étape 2 : Vérifier que le Goal Existe

1. Allez dans **Settings** → **Goals**
2. Vérifiez que `payment_initiated` existe comme goal
3. Si ce n'est pas le cas, créez-le :
   - Cliquez sur "Add goal"
   - Nom : `payment_initiated`
   - Type : Custom event
   - Cliquez sur "Add goal"

### Étape 3 : Vérifier l'Ordre Final

Votre funnel devrait maintenant avoir cet ordre exact :

```
1. form_started
2. services_selected
3. documents_uploaded
4. signatories_added
5. appointment_booked
6. personal_info_completed
7. summary_viewed
8. payment_initiated  ← NOUVELLE ÉTAPE
9. payment_completed
```

## 📊 Pourquoi C'est Important

Le code track `payment_initiated` quand l'utilisateur clique sur "Confirm & Pay", puis `payment_completed` après le paiement réussi. Sans `payment_initiated`, le funnel ne peut pas suivre correctement le parcours jusqu'à la conversion.

## 🔍 Vérification

Après avoir ajouté `payment_initiated` :

1. Testez le formulaire complètement
2. Vérifiez dans Plausible → Funnels
3. Vous devriez voir :
   - `payment_initiated` avec des visiteurs
   - `payment_completed` avec un dropoff < 100%

## 📝 Checklist

- [ ] Goal `payment_initiated` créé dans Settings → Goals
- [ ] Étape `payment_initiated` ajoutée dans le funnel entre `summary_viewed` et `payment_completed`
- [ ] Funnel sauvegardé avec "Update funnel"
- [ ] Test du formulaire complet effectué
- [ ] Vérification que les données remontent correctement



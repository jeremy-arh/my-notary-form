# Système de Mise à Jour du Funnel Status

## Vue d'ensemble

Le `funnel_status` est maintenant mis à jour **automatiquement** à chaque complétion d'étape pour garantir la cohérence.

## Mapping des Étapes vers Funnel Status

| Étape | ID | Nom | Funnel Status |
|-------|----|----|---------------|
| 1 | 1 | Choose Services | `services_selected` |
| 2 | 2 | Upload Documents | `documents_uploaded` |
| 3 | 3 | Delivery Method | `delivery_method_selected` |
| 4 | 4 | Personal Info | `personal_info_completed` |
| 5 | 5 | Summary | *(pas de changement)* |
| - | - | Payment Initiated | `payment_pending` |
| - | - | Payment Completed | `payment_completed` |

**Note** : L'étape "signatories_added" a été retirée car cette étape n'existe plus dans le formulaire.

## Points de Mise à Jour

### 1. Complétion d'Étape (`markStepCompleted`)
- **Fichier** : `client-dashboard/src/components/NotaryForm.jsx`
- **Fonction** : `markStepCompleted(stepId)`
- **Action** : Appelle `updateFunnelStatus(stepId)` pour mettre à jour le `funnel_status` dans la submission
- **Quand** : À chaque fois qu'une étape est marquée comme complétée

### 2. Sauvegarde de Submission (`saveSubmission`)
- **Fichier** : `client-dashboard/src/utils/submissionSave.js`
- **Fonction** : `saveSubmission(formData, currentStep, ...)`
- **Action** : Met à jour le `funnel_status` basé sur `currentStep` lors de la sauvegarde
- **Quand** : Lors de la sauvegarde automatique ou manuelle de la submission

### 3. Initiation du Paiement (`create-checkout-session`)
- **Fichier** : `supabase/functions/create-checkout-session/index.ts`
- **Action** : Met à jour le `funnel_status` à `'payment_pending'` après création de la session Stripe
- **Quand** : Lorsque l'utilisateur clique sur "Pay" et que la session de paiement est créée

### 4. Fonction Dédiée (`updateFunnelStatus`)
- **Fichier** : `client-dashboard/src/utils/updateFunnelStatus.js`
- **Fonction** : `updateFunnelStatus(completedStepId, submissionId)`
- **Action** : Met à jour directement le `funnel_status` dans la submission
- **Utilisation** : Appelée depuis `markStepCompleted` et `handleContinueClick`

## Flux de Mise à Jour

```
Utilisateur complète une étape
    ↓
markStepCompleted(stepId) appelé
    ↓
updateFunnelStatus(stepId) appelé
    ↓
Recherche de la submission par session_id
    ↓
Mise à jour du funnel_status dans la submission
    ↓
Logs de confirmation
```

## Vérification

Pour vérifier que le système fonctionne :

1. **Dans la console du navigateur** : Cherchez les logs `[FUNNEL]`
2. **Dans Supabase** : Vérifiez la colonne `funnel_status` de la table `submission`
3. **Dans les logs Edge Function** : Vérifiez les mises à jour lors du paiement

## Migration SQL Requise

Exécutez `supabase/migrations/20250119_remove_signatories_added_from_funnel.sql` pour :
- Retirer `'signatories_added'` de la contrainte CHECK
- Mettre à jour les submissions existantes

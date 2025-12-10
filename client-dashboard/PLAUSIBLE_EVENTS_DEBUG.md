# 🔍 Débogage des Événements Plausible

## Problème : Les événements ne remontent pas dans Plausible

### Causes possibles

1. **Plausible ignore les événements de localhost** (cause principale)
   - Par défaut, Plausible ignore les événements provenant de `localhost` ou `127.0.0.1`
   - Solution : Désactiver "Ignore localhost" dans les paramètres Plausible

2. **Les événements ne sont pas configurés comme "Goals"**
   - Les événements personnalisés doivent être créés comme "Goals" dans Plausible
   - Solution : Créer les Goals dans Plausible Settings

3. **Le script Plausible est bloqué par un ad blocker**
   - Les ad blockers peuvent bloquer le script Plausible
   - Solution : Désactiver l'ad blocker ou tester sur un domaine de production

## ✅ Solutions

### Solution 1 : Désactiver "Ignore localhost" dans Plausible

1. Connectez-vous à votre dashboard Plausible : https://plausible.io
2. Allez dans **Settings** > **General**
3. Trouvez l'option **"Ignore localhost"**
4. **Désactivez** cette option
5. Sauvegardez les changements

⚠️ **Important** : Après avoir désactivé cette option, les événements de localhost seront trackés.

### Solution 2 : Créer les Goals dans Plausible

Les événements suivants doivent être créés comme "Goals" dans Plausible :

1. Allez dans **Settings** > **Goals**
2. Cliquez sur **"Add goal"**
3. Créez les Goals suivants :

| Goal Name | Event Name | Description |
|-----------|------------|-------------|
| Form Started | `form_started` | User lands on the form |
| Services Selected | `services_selected` | User selects at least one service |
| Documents Uploaded | `documents_uploaded` | User uploads documents |
| Signatories Added | `signatories_added` | User adds signatories |
| Appointment Booked | `appointment_booked` | User selects date and time |
| Personal Info Completed | `personal_info_completed` | User fills in personal information |
| Summary Viewed | `summary_viewed` | User reaches the summary page |
| Payment Initiated | `payment_initiated` | User clicks submit and payment starts |
| Payment Completed | `payment_completed` | Payment successful |

**Format pour créer un Goal** :
- **Goal trigger** : `Custom event`
- **Event name** : `form_started` (ou autre nom d'événement)
- **Goal name** : `Form Started` (nom affiché)

### Solution 3 : Vérifier les logs dans la console

Ouvrez la console du navigateur (F12) et vérifiez les logs :

1. **Au chargement de la page** :
   ```
   ✅ [Plausible] Script loaded successfully
   ✅ [Plausible] Function is available and callable
   ```

2. **Lors d'un événement** :
   ```
   🔍 [Plausible] Tracking event: form_started
   🚀 [Plausible] Sending event to Plausible: form_started
   ✅ [Plausible] Event sent with props: form_started
   ```

3. **Si vous voyez des erreurs** :
   ```
   ❌ [Plausible] window.plausible is NOT available!
   ⚠️ [Plausible] Running on localhost
   ⚠️ [Plausible] Plausible may ignore events from localhost
   ```

### Solution 4 : Tester sur un domaine de production/staging

Si vous ne pouvez pas désactiver "Ignore localhost", testez sur :
- Un domaine de staging (ex: `staging.mynotary.io`)
- Un domaine de production (ex: `client.mynotary.io`)

Les événements fonctionneront automatiquement sur ces domaines.

## 🔍 Vérification dans Plausible

1. Allez dans votre dashboard Plausible
2. Sélectionnez le site `mynotary.io`
3. Allez dans **Goals** ou **Funnels**
4. Vérifiez que les événements apparaissent

### Vérifier les événements en temps réel

1. Dans Plausible, allez dans **Realtime**
2. Effectuez une action sur le formulaire
3. L'événement devrait apparaître dans les 1-2 secondes

## 📊 Événements trackés dans le formulaire

| Étape | Événement | Quand |
|-------|-----------|-------|
| 1 | `form_started` | User arrive sur le formulaire |
| 2 | `services_selected` | User sélectionne des services |
| 3 | `documents_uploaded` | User upload des documents |
| 4 | `signatories_added` | User ajoute des signataires |
| 5 | `appointment_booked` | User sélectionne date/heure |
| 6 | `personal_info_completed` | User remplit ses infos |
| 7 | `summary_viewed` | User arrive sur le résumé |
| 8 | `payment_initiated` | User clique sur "Submit" |
| 9 | `payment_completed` | Paiement réussi |

## 🐛 Problèmes courants

### Les événements ne s'affichent pas dans Plausible

**Cause** : Plausible ignore localhost

**Solution** :
1. Désactiver "Ignore localhost" dans Plausible Settings
2. OU tester sur un domaine de production

### Les événements apparaissent mais pas dans les Funnels

**Cause** : Les Goals ne sont pas créés

**Solution** : Créer tous les Goals listés ci-dessus dans Plausible Settings > Goals

### Le script Plausible ne se charge pas

**Cause** : Ad blocker ou erreur réseau

**Solution** :
1. Vérifier la console pour les erreurs
2. Désactiver l'ad blocker
3. Vérifier la connexion réseau

## 📝 Notes importantes

- Les événements sont envoyés à la fois à Plausible ET à Supabase (backup)
- Si Plausible échoue, les événements sont sauvegardés dans Supabase
- Les logs détaillés sont disponibles dans la console du navigateur
- Les événements fonctionnent automatiquement en production

## 🔗 Liens utiles

- [Plausible Documentation - Custom Events](https://plausible.io/docs/custom-event-goals)
- [Plausible Documentation - Funnels](https://plausible.io/docs/funnels)
- [Plausible Settings](https://plausible.io/settings)


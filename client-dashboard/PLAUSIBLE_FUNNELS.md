# Configuration des Funnels Plausible pour le Formulaire

Ce document explique comment configurer les funnels de conversion dans Plausible Analytics pour suivre le parcours des utilisateurs dans le formulaire de notarisation.

## 📊 Événements Trackés

Le système de tracking envoie les événements suivants à Plausible :

### Funnel Principal - Conversion du Formulaire

1. **`form_started`** - L'utilisateur arrive sur la première étape du formulaire
   - Props: `funnel_step: "1_form_started"`

2. **`services_selected`** - L'utilisateur sélectionne au moins un service
   - Props: 
     - `funnel_step: "2_services_selected"`
     - `services_count`: Nombre de services sélectionnés
     - `service_ids`: Liste des IDs de services (séparés par virgule)

3. **`documents_uploaded`** - L'utilisateur upload des documents pour au moins un service
   - Props:
     - `funnel_step: "3_documents_uploaded"`
     - `documents_count`: Nombre total de documents uploadés
     - `services_with_docs`: Nombre de services avec documents

4. **`signatories_added`** - L'utilisateur ajoute au moins un signataire
   - Props:
     - `funnel_step: "4_signatories_added"`
     - `signatories_count`: Nombre de signataires ajoutés

5. **`appointment_booked`** - L'utilisateur sélectionne une date et heure de rendez-vous
   - Props:
     - `funnel_step: "5_appointment_booked"`
     - `appointment_date`: Date du rendez-vous
     - `appointment_time`: Heure du rendez-vous
     - `timezone`: Fuseau horaire

6. **`personal_info_completed`** - L'utilisateur remplit ses informations personnelles
   - Props:
     - `funnel_step: "6_personal_info_completed"`
     - `is_authenticated`: Si l'utilisateur est authentifié

7. **`summary_viewed`** - L'utilisateur arrive sur la page de résumé
   - Props:
     - `funnel_step: "7_summary_viewed"`
     - `total_services`: Nombre total de services
     - `total_documents`: Nombre total de documents
     - `total_signatories`: Nombre total de signataires
     - `has_appointment`: Si un rendez-vous a été réservé

8. **`payment_initiated`** - L'utilisateur clique sur "Submit" et le processus de paiement commence
   - Props:
     - `funnel_step: "8_payment_initiated"`
     - `total_amount`: Montant total (calculé par le backend)
     - `services_count`: Nombre de services
     - `currency`: Devise (EUR)

9. **`payment_completed`** - Paiement réussi et soumission complétée
   - Props:
     - `funnel_step: "9_payment_completed"`
     - `transaction_id`: ID de la transaction
     - `total_amount`: Montant payé
     - `submission_id`: ID de la soumission
     - `currency`: Devise (EUR)

### Événements Supplémentaires

- **`form_abandoned`** - L'utilisateur quitte le formulaire avant de compléter
  - Props:
    - `abandoned_at_step`: Numéro de l'étape où l'utilisateur a abandonné
    - `step_name`: Nom de l'étape

- **`step_navigation`** - Navigation entre les étapes
  - Props:
    - `from_step`: Étape de départ
    - `to_step`: Étape d'arrivée
    - `direction`: "next" ou "prev"

## 🎯 Configuration du Funnel dans Plausible

### Étape 1 : Accéder aux Funnels

1. Connectez-vous à votre compte Plausible Analytics
2. Sélectionnez le site `mynotary.io`
3. Allez dans **Goals** → **Funnels**

### Étape 2 : Créer un Nouveau Funnel

Cliquez sur **"Create a new funnel"** et configurez-le comme suit :

**Nom du Funnel:** `Form Conversion Funnel`

**Étapes du Funnel:**

1. **Étape 1:** `form_started`
2. **Étape 2:** `services_selected`
3. **Étape 3:** `documents_uploaded`
4. **Étape 4:** `signatories_added`
5. **Étape 5:** `appointment_booked`
6. **Étape 6:** `personal_info_completed`
7. **Étape 7:** `summary_viewed`
8. **Étape 8:** `payment_initiated`
9. **Étape 9:** `payment_completed`

### Étape 3 : Filtrer par Propriété (Optionnel)

Vous pouvez créer des variantes du funnel en filtrant par propriétés :

**Exemple - Funnel pour utilisateurs authentifiés:**
- Ajoutez un filtre sur `personal_info_completed` avec `is_authenticated = true`

**Exemple - Funnel par nombre de services:**
- Ajoutez un filtre sur `services_selected` avec `services_count >= 2`

## 📈 Métriques Disponibles

Une fois le funnel configuré, vous pourrez voir :

- **Taux de conversion** entre chaque étape
- **Taux d'abandon** à chaque étape
- **Temps moyen** passé sur chaque étape
- **Taux de conversion global** (de `form_started` à `payment_completed`)

## 🔍 Analyse des Abandons

Pour analyser où les utilisateurs abandonnent :

1. Allez dans **Goals** → **Custom Events**
2. Recherchez l'événement `form_abandoned`
3. Analysez la propriété `abandoned_at_step` pour voir à quelle étape les utilisateurs quittent le plus souvent

## 📝 Notes Importantes

- Les événements sont envoyés via l'API Plausible (pas via le script standard)
- Le tracking fonctionne uniquement en production (pas en développement local)
- Les événements incluent toujours l'URL actuelle pour le contexte
- Le système track automatiquement les navigations entre étapes

## 🚀 Test du Tracking

Pour vérifier que le tracking fonctionne :

1. Ouvrez la console du navigateur
2. Complétez le formulaire étape par étape
3. Vérifiez les requêtes réseau vers `https://plausible.io/api/event`
4. Dans Plausible, vérifiez que les événements apparaissent dans **Goals** → **Custom Events**

## 📊 Exemple de Funnel Configuré

```
Form Conversion Funnel
├── 1. form_started (100%)
│   └── 2. services_selected (85%)
│       └── 3. documents_uploaded (75%)
│           └── 4. signatories_added (70%)
│               └── 5. appointment_booked (65%)
│                   └── 6. personal_info_completed (60%)
│                       └── 7. summary_viewed (55%)
│                           └── 8. payment_initiated (50%)
│                               └── 9. payment_completed (45%)
```

Ce funnel vous permettra d'identifier les points de friction et d'optimiser le parcours utilisateur.




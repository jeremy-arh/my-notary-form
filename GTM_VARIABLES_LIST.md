# Liste complète des variables GTM à créer

Ce document liste toutes les variables nécessaires pour capturer les événements GTM dans votre application.

## 📋 Structure

- **GTM Web (Client-Side)** : Variables de type "Variable de la couche de données" (Data Layer Variable)
- **GTM Server-Side** : Variables de type "Données d'événement" (Event Data)

---

## 1️⃣ ÉVÉNEMENT : `page_view`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Page Title** | Variable de la couche de données | `page_title` | Titre de la page |
| **Page Location** | Variable de la couche de données | `page_location` | URL complète de la page |
| **Page Path** | Variable de la couche de données | `page_path` | Chemin de la page |
| **Page Name** | Variable de la couche de données | `page_name` | Nom de la page |
| **Page Referrer** | Variable de la couche de données | `page_referrer` | URL de référence |
| **Screen Resolution** | Variable de la couche de données | `screen_resolution` | Résolution d'écran |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Page Title** | Données d'événement | `page_title` | Titre de la page |
| **Page Location** | Données d'événement | `page_location` | URL complète de la page |
| **Page Path** | Données d'événement | `page_path` | Chemin de la page |
| **Page Name** | Données d'événement | `page_name` | Nom de la page |
| **Page Referrer** | Données d'événement | `page_referrer` | URL de référence |
| **Screen Resolution** | Données d'événement | `screen_resolution` | Résolution d'écran |

---

## 2️⃣ ÉVÉNEMENT : `form_start`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Form Name** | Variable de la couche de données | `form_name` | Nom du formulaire |
| **Service Type** | Variable de la couche de données | `service_type` | Type de service |
| **CTA Location** | Variable de la couche de données | `cta_location` | Emplacement du CTA |
| **CTA Text** | Variable de la couche de données | `cta_text` | Texte du CTA |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Form Name** | Données d'événement | `form_name` | Nom du formulaire |
| **Service Type** | Données d'événement | `service_type` | Type de service |
| **CTA Location** | Données d'événement | `cta_location` | Emplacement du CTA |
| **CTA Text** | Données d'événement | `cta_text` | Texte du CTA |

---

## 3️⃣ ÉVÉNEMENT : `form_step_completed`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Step Number** | Variable de la couche de données | `step_number` | Numéro de l'étape |
| **Step Name** | Variable de la couche de données | `step_name` | Nom de l'étape |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Step Number** | Données d'événement | `step_number` | Numéro de l'étape |
| **Step Name** | Données d'événement | `step_name` | Nom de l'étape |

---

## 4️⃣ ÉVÉNEMENT : `begin_checkout`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Currency** | Variable de la couche de données | `currency` | Devise (USD, EUR, etc.) |
| **Checkout Value** | Variable de la couche de données | `value` | Montant total du checkout |
| **Items** | Variable de la couche de données | `items` | Tableau des items (voir structure ci-dessous) |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Currency** | Données d'événement | `currency` | Devise (USD, EUR, etc.) |
| **Checkout Value** | Données d'événement | `value` | Montant total du checkout |
| **Items** | Données d'événement | `items` | Tableau des items |

### Structure des Items (pour variables imbriquées)
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Item ID** | Données d'événement | `items.0.item_id` | ID de l'item (pour le premier item) |
| **Item Name** | Données d'événement | `items.0.item_name` | Nom de l'item |
| **Item Category** | Données d'événement | `items.0.item_category` | Catégorie de l'item |
| **Item Price** | Données d'événement | `items.0.price` | Prix de l'item |
| **Item Quantity** | Données d'événement | `items.0.quantity` | Quantité |

> **Note** : Pour accéder aux items suivants, utilisez `items.1`, `items.2`, etc.

---

## 5️⃣ ÉVÉNEMENT : `form_submission_start`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Form Type** | Variable de la couche de données | `form_type` | Type de formulaire |
| **Options Count** | Variable de la couche de données | `options_count` | Nombre d'options sélectionnées |
| **Documents Count** | Variable de la couche de données | `documents_count` | Nombre de documents |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Form Type** | Données d'événement | `form_type` | Type de formulaire |
| **Options Count** | Données d'événement | `options_count` | Nombre d'options sélectionnées |
| **Documents Count** | Données d'événement | `documents_count` | Nombre de documents |

---

## 6️⃣ ÉVÉNEMENT : `form_submit`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Form Type** | Variable de la couche de données | `form_type` | Type de formulaire |
| **Submission ID** | Variable de la couche de données | `submission_id` | ID de la soumission |
| **Options Count** | Variable de la couche de données | `options_count` | Nombre d'options sélectionnées |
| **Documents Count** | Variable de la couche de données | `documents_count` | Nombre de documents |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Form Type** | Données d'événement | `form_type` | Type de formulaire |
| **Submission ID** | Données d'événement | `submission_id` | ID de la soumission |
| **Options Count** | Données d'événement | `options_count` | Nombre d'options sélectionnées |
| **Documents Count** | Données d'événement | `documents_count` | Nombre de documents |

---

## 7️⃣ ÉVÉNEMENT : `purchase` (Enhanced Conversions)

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Transaction ID** | Variable de la couche de données | `transaction_id` | ID de la transaction |
| **Purchase Value** | Variable de la couche de données | `value` | Montant total de l'achat |
| **Currency** | Variable de la couche de données | `currency` | Devise (USD, EUR, etc.) |
| **Submission ID** | Variable de la couche de données | `submission_id` | ID de la soumission |
| **Services Count** | Variable de la couche de données | `services_count` | Nombre de services |
| **New Customer** | Variable de la couche de données | `new_customer` | Nouveau client (true/false) |
| **User Data** | Variable de la couche de données | `user_data` | Données utilisateur (voir structure ci-dessous) |
| **Items** | Variable de la couche de données | `items` | Tableau des items |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Transaction ID** | Données d'événement | `transaction_id` | ID de la transaction |
| **Purchase Value** | Données d'événement | `value` | Montant total de l'achat |
| **Currency** | Données d'événement | `currency` | Devise (USD, EUR, etc.) |
| **Submission ID** | Données d'événement | `submission_id` | ID de la soumission |
| **Services Count** | Données d'événement | `services_count` | Nombre de services |
| **New Customer** | Données d'événement | `new_customer` | Nouveau client (true/false) |
| **User Data** | Données d'événement | `user_data` | Données utilisateur |
| **Items** | Données d'événement | `items` | Tableau des items |

### Structure User Data (pour Enhanced Conversions)
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **User Email** | Données d'événement | `user_data.email` | Email de l'utilisateur |
| **User Phone** | Données d'événement | `user_data.phone_number` | Téléphone de l'utilisateur |
| **User First Name** | Données d'événement | `user_data.address.first_name` | Prénom |
| **User Last Name** | Données d'événement | `user_data.address.last_name` | Nom de famille |
| **User Postal Code** | Données d'événement | `user_data.address.postal_code` | Code postal |
| **User Country** | Données d'événement | `user_data.address.country` | Pays |

### Structure Items (pour purchase)
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Item ID** | Données d'événement | `items.0.item_id` | ID de l'item |
| **Item Name** | Données d'événement | `items.0.item_name` | Nom de l'item |
| **Item Price** | Données d'événement | `items.0.price` | Prix de l'item |
| **Item Quantity** | Données d'événement | `items.0.quantity` | Quantité |

---

## 8️⃣ ÉVÉNEMENT : `payment_failed`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Error Message** | Variable de la couche de données | `error_message` | Message d'erreur |
| **Submission ID** | Variable de la couche de données | `submission_id` | ID de la soumission |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Error Message** | Données d'événement | `error_message` | Message d'erreur |
| **Submission ID** | Données d'événement | `submission_id` | ID de la soumission |

---

## 9️⃣ ÉVÉNEMENT : `service_selected`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Service ID** | Variable de la couche de données | `service_id` | ID du service |
| **Service Name** | Variable de la couche de données | `service_name` | Nom du service |
| **Service Price** | Variable de la couche de données | `service_price` | Prix du service |
| **Currency** | Variable de la couche de données | `currency` | Devise |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Service ID** | Données d'événement | `service_id` | ID du service |
| **Service Name** | Données d'événement | `service_name` | Nom du service |
| **Service Price** | Données d'événement | `service_price` | Prix du service |
| **Currency** | Données d'événement | `currency` | Devise |

---

## 🔟 ÉVÉNEMENT : `document_uploaded`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Service ID** | Variable de la couche de données | `service_id` | ID du service |
| **Document Count** | Variable de la couche de données | `document_count` | Nombre de documents |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Service ID** | Données d'événement | `service_id` | ID du service |
| **Document Count** | Données d'événement | `document_count` | Nombre de documents |

---

## 1️⃣1️⃣ ÉVÉNEMENT : `appointment_booked`

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Appointment Date** | Variable de la couche de données | `appointment_date` | Date du rendez-vous |
| **Appointment Time** | Variable de la couche de données | `appointment_time` | Heure du rendez-vous |
| **Timezone** | Variable de la couche de données | `timezone` | Fuseau horaire |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Appointment Date** | Données d'événement | `appointment_date` | Date du rendez-vous |
| **Appointment Time** | Données d'événement | `appointment_time` | Heure du rendez-vous |
| **Timezone** | Données d'événement | `timezone` | Fuseau horaire |

---

## 📝 Variables communes (toujours présentes)

### Variables GTM Web (Client-Side)
| Nom de la variable | Type | Nom de la variable dans dataLayer | Description |
|-------------------|------|-----------------------------------|-------------|
| **Event Name** | Variable de la couche de données | `event_name` | Nom de l'événement (pour compatibilité server-side) |

### Variables GTM Server-Side
| Nom de la variable | Type | Chemin de clé | Description |
|-------------------|------|---------------|-------------|
| **Event Name** | Données d'événement | `event_name` | Nom de l'événement |

---

## 🎯 Résumé par priorité

### Priorité HAUTE (événements principaux)
1. **page_view** - 6 variables
2. **form_start** - 4 variables
3. **form_step_completed** - 2 variables
4. **begin_checkout** - 3 variables (+ items)
5. **purchase** - 8 variables (+ user_data + items)

### Priorité MOYENNE (événements secondaires)
6. **form_submission_start** - 3 variables
7. **form_submit** - 4 variables
8. **payment_failed** - 2 variables

### Priorité BASSE (événements optionnels)
9. **service_selected** - 4 variables
10. **document_uploaded** - 2 variables
11. **appointment_booked** - 3 variables

---

## 📊 Total des variables

- **GTM Web (Client-Side)** : ~45 variables principales
- **GTM Server-Side** : ~45 variables principales
- **Variables imbriquées (user_data, items)** : ~15 variables supplémentaires

**Total approximatif** : ~60 variables uniques à créer dans chaque conteneur GTM

---

## ⚠️ Notes importantes

1. **Variables imbriquées** : Pour accéder aux données imbriquées comme `user_data.email` ou `items.0.item_id`, utilisez le chemin complet dans le champ "Chemin de clé" ou "Nom de la variable dans dataLayer".

2. **Tableaux (items)** : Les items sont un tableau. Pour accéder au premier item, utilisez `items.0`, au deuxième `items.1`, etc.

3. **Valeurs par défaut** : Certaines variables peuvent avoir des valeurs par défaut (ex: `currency: 'EUR'`). Configurez-les dans GTM si nécessaire.

4. **Types de données** : 
   - `value`, `price`, `quantity` sont des nombres
   - `new_customer` est un booléen (true/false)
   - Tous les autres sont des chaînes de caractères

5. **Compatibilité** : Toutes les variables sont envoyées avec `event_name` pour compatibilité avec GTM Server-Side.


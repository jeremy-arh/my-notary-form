# Configuration GTM : Balises pour l'événement Purchase

## 📋 Variables à créer (si pas déjà créées)

### Variables de la couche de données (Data Layer Variables)

1. **Transaction ID**
   - Type : Variable de couche de données
   - Nom de la variable : `transaction_id`
   - ✅ Déjà créée (visible dans votre screenshot)

2. **Transaction Value**
   - Type : Variable de couche de données
   - Nom de la variable : `value`
   - ✅ Déjà créée (visible dans votre screenshot)

3. **Currency**
   - Type : Variable de couche de données
   - Nom de la variable : `currency`
   - ✅ Déjà créée (visible dans votre screenshot)

4. **New Customer** (Nouveau)
   - Type : Variable de couche de données
   - Nom de la variable : `new_customer`
   - Valeur par défaut : `false`

5. **Services Count** (Nouveau)
   - Type : Variable de couche de données
   - Nom de la variable : `services_count`
   - Valeur par défaut : `0`

### Variables pour Enhanced Conversions (User Data)

6. **User Email** (Nouveau)
   - Type : Variable de couche de données
   - Nom de la variable : `user_data.email`
   - Valeur par défaut : (vide)

7. **User Phone** (Nouveau)
   - Type : Variable de couche de données
   - Nom de la variable : `user_data.phone_number`
   - Valeur par défaut : (vide)

8. **User First Name** (Nouveau)
   - Type : Variable de couche de données
   - Nom de la variable : `user_data.address.first_name`
   - Valeur par défaut : (vide)

9. **User Last Name** (Nouveau)
   - Type : Variable de couche de données
   - Nom de la variable : `user_data.address.last_name`
   - Valeur par défaut : (vide)

10. **User Postal Code** (Nouveau)
    - Type : Variable de couche de données
    - Nom de la variable : `user_data.address.postal_code`
    - Valeur par défaut : (vide)

11. **User Country** (Nouveau)
    - Type : Variable de couche de données
    - Nom de la variable : `user_data.address.country`
    - Valeur par défaut : (vide)

### Variable pour Items (Array)

12. **Items Array** (Nouveau)
    - Type : Variable de couche de données
    - Nom de la variable : `items`
    - Valeur par défaut : `[]`

---

## 🎯 Déclencheur à créer

### Déclencheur "Purchase Event"

1. **Nom** : `Event - Purchase`
2. **Type** : Événement personnalisé
3. **Nom de l'événement** : `purchase`
4. **Cette balise se déclenche** : Sur certains événements personnalisés
5. **Nom de l'événement** : `purchase` (exactement)

---

## 🏷️ Balises à créer

### 1. Google Ads - Conversion Tracking (Purchase)

**Configuration** :
- **Type de balise** : Suivi des conversions Google Ads
- **Nom** : `Google Ads - Conversion Purchase`
- **ID de conversion** : `AW-17719745439`
- **Libellé de conversion** : `[À configurer avec votre libellé Google Ads]`
- **Valeur de conversion** : `{{Transaction Value}}`
- **Code devise** : `{{Currency}}`
- **ID de transaction** : `{{Transaction ID}}`

**Paramètres de conversion améliorés (Enhanced Conversions)** :
- ✅ **Activer les conversions améliorées** : Oui
- **Mode de conversion améliorée** : Automatique OU Manuel
  - Si **Manuel** :
    - **Email** : `{{User Email}}`
    - **Téléphone** : `{{User Phone}}`
    - **Prénom** : `{{User First Name}}`
    - **Nom** : `{{User Last Name}}`
    - **Code postal** : `{{User Postal Code}}`
    - **Pays** : `{{User Country}}`

**Déclencheur** : `Event - Purchase`

---

### 2. Google Ads - Remarketing Tag (Purchase)

**Configuration** :
- **Type de balise** : Google Ads Remarketing
- **Nom** : `Google Ads - Remarketing Purchase`
- **ID de conversion** : `AW-17719745439`
- **Format de balise** : Standard

**Paramètres personnalisés** :
- `transaction_id` : `{{Transaction ID}}`
- `value` : `{{Transaction Value}}`
- `currency` : `{{Currency}}`
- `new_customer` : `{{New Customer}}`
- `services_count` : `{{Services Count}}`

**Déclencheur** : `Event - Purchase`

---

### 3. Google Analytics 4 - Purchase Event (Optionnel)

Si vous utilisez GA4 :

**Configuration** :
- **Type de balise** : Google Analytics : GA4 Event
- **Nom** : `GA4 - Purchase Event`
- **ID de mesure** : `[Votre ID GA4]`
- **Nom de l'événement** : `purchase`

**Paramètres d'événement** :
- `transaction_id` : `{{Transaction ID}}`
- `value` : `{{Transaction Value}}`
- `currency` : `{{Currency}}`
- `items` : `{{Items Array}}`

**Déclencheur** : `Event - Purchase`

---

## 📝 Instructions détaillées pour créer les variables

### Créer une Variable de couche de données

1. Cliquer sur **"Nouvelle"** dans la section "Variables définies par l'utilisateur"
2. Choisir **"Variable de couche de données"**
3. **Nom de la variable** : Entrer le nom exact (ex: `transaction_id`)
4. **Nom de la variable de la couche de données** : Même nom (ex: `transaction_id`)
5. **Valeur par défaut** : (optionnel, selon la variable)
6. Cliquer sur **"Enregistrer"**

### Pour les variables imbriquées (user_data)

Pour `user_data.email`, le nom de la variable de la couche de données sera : `user_data.email`

Pour `user_data.address.first_name`, le nom sera : `user_data.address.first_name`

---

## 📝 Instructions détaillées pour créer le déclencheur

1. Aller dans **"Déclencheurs"** dans le menu de gauche
2. Cliquer sur **"Nouveau"**
3. **Nom** : `Event - Purchase`
4. **Type** : **Événement personnalisé**
5. **Nom de l'événement** : `purchase` (exactement, en minuscules)
6. Cliquer sur **"Enregistrer"**

---

## 📝 Instructions détaillées pour créer la balise Google Ads

1. Aller dans **"Balises"** dans le menu de gauche
2. Cliquer sur **"Nouvelle"**
3. **Nom** : `Google Ads - Conversion Purchase`
4. **Type de balise** : **Suivi des conversions Google Ads**
5. **ID de conversion** : `AW-17719745439`
6. **Libellé de conversion** : `[Votre libellé de conversion Google Ads]`
   - Pour trouver votre libellé :
     - Aller dans Google Ads → Outils → Conversions
     - Sélectionner votre action de conversion
     - Le libellé est affiché dans les détails
7. **Valeur de conversion** : Cliquer sur l'icône `{{}}` et sélectionner `{{Transaction Value}}`
8. **Code devise** : Cliquer sur l'icône `{{}}` et sélectionner `{{Currency}}`
9. **ID de transaction** : Cliquer sur l'icône `{{}}` et sélectionner `{{Transaction ID}}`

### Activer Enhanced Conversions

10. **Conversions améliorées** : Cocher **"Activer les conversions améliorées"**
11. **Mode** : Choisir **"Automatique"** (recommandé) ou **"Manuel"**
    - Si **Manuel** :
      - **Email** : `{{User Email}}`
      - **Téléphone** : `{{User Phone}}`
      - **Prénom** : `{{User First Name}}`
      - **Nom** : `{{User Last Name}}`
      - **Code postal** : `{{User Postal Code}}`
      - **Pays** : `{{User Country}}`

12. **Déclencheur** : Cliquer sur **"Déclencheur"** → Sélectionner `Event - Purchase`
13. Cliquer sur **"Enregistrer"**

---

## ✅ Checklist de vérification

### Variables
- [ ] Transaction ID
- [ ] Transaction Value
- [ ] Currency
- [ ] New Customer
- [ ] Services Count
- [ ] User Email
- [ ] User Phone
- [ ] User First Name
- [ ] User Last Name
- [ ] User Postal Code
- [ ] User Country
- [ ] Items Array

### Déclencheur
- [ ] Event - Purchase (Événement personnalisé : `purchase`)

### Balises
- [ ] Google Ads - Conversion Purchase
  - [ ] ID de conversion configuré
  - [ ] Libellé de conversion configuré
  - [ ] Variables mappées (Transaction Value, Currency, Transaction ID)
  - [ ] Enhanced Conversions activé
  - [ ] Déclencheur configuré
- [ ] Google Ads - Remarketing Purchase (optionnel)
- [ ] GA4 - Purchase Event (optionnel)

---

## 🧪 Test de la configuration

1. **Mode Preview** :
   - Cliquer sur **"Prévisualiser"** dans GTM
   - Entrer l'URL de votre site
   - Effectuer un paiement de test
   - Vérifier que l'événement `purchase` apparaît
   - Vérifier que les variables sont correctement remplies
   - Vérifier que la balise Google Ads se déclenche

2. **Vérification dans la console** :
   - Ouvrir les DevTools (F12)
   - Aller dans l'onglet "Console"
   - Taper : `window.dataLayer`
   - Vérifier que l'événement `purchase` est présent avec toutes les données

3. **Vérification dans Google Ads** :
   - Aller dans Google Ads → Outils → Conversions
   - Vérifier que les conversions sont enregistrées (peut prendre quelques heures)

---

## 📊 Structure attendue dans dataLayer

L'événement `purchase` devrait avoir cette structure :

```javascript
{
  event: "purchase",
  event_name: "purchase",
  transaction_id: "abc123-def456-ghi789",
  value: 150.00,
  currency: "EUR", // ou "USD" selon le checkout
  user_data: {
    email: "user@example.com",
    phone_number: "+33123456789",
    address: {
      first_name: "John",
      last_name: "Doe",
      postal_code: "75001",
      country: "FR"
    }
  },
  items: [
    {
      item_id: "service-123",
      item_name: "Notarization",
      price: 75.00,
      quantity: 1
    }
  ],
  new_customer: true,
  services_count: 2
}
```

---

## 🔧 Dépannage

### Si les variables ne sont pas remplies

1. Vérifier que les noms des variables dans GTM correspondent exactement aux clés dans le dataLayer
2. Vérifier dans la console que les données sont bien dans le dataLayer
3. Utiliser GTM Preview Mode pour voir les valeurs des variables

### Si la balise ne se déclenche pas

1. Vérifier que le déclencheur `Event - Purchase` est bien configuré
2. Vérifier que l'événement `purchase` est bien envoyé au dataLayer
3. Vérifier dans GTM Preview Mode que l'événement est détecté

### Si Enhanced Conversions ne fonctionne pas

1. Vérifier que les variables user_data sont bien créées
2. Vérifier que les données sont bien dans le dataLayer
3. Vérifier dans Google Ads que Enhanced Conversions est activé pour cette action de conversion

---

## 📚 Ressources

- [Documentation Google Ads Enhanced Conversions](https://support.google.com/google-ads/answer/9888156)
- [Documentation GTM Data Layer](https://developers.google.com/tag-manager/devguide)
- [Documentation Google Ads Conversion Tracking](https://support.google.com/google-ads/answer/1722054)


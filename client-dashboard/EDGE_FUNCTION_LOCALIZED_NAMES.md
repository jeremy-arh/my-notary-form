# Edge Function - Utilisation des Libellés Traduits pour Stripe

## Problème
Les noms des produits dans le checkout Stripe sont affichés en anglais alors que l'interface utilisateur est traduite.

## Solution
L'Edge Function `create-checkout-session` doit utiliser les libellés traduits envoyés depuis le frontend pour créer les line items Stripe.

## Données reçues

L'Edge Function reçoit dans `formData` :
- `formData.language` : code de langue (ex: 'fr', 'es', 'pt', 'en', 'de', 'it')
- `formData.localizedLineItems` : tableau d'objets avec les libellés traduits
- `formData.localizedNames` : objet de mapping des IDs vers les noms traduits

### Structure de `localizedLineItems`

```typescript
[
  {
    type: 'service',
    id: 'service_id',
    name: 'Nom traduit du service (X document(s))',
    quantity: 1
  },
  {
    type: 'option',
    id: 'option_id',
    name: 'Nom traduit de l\'option',
    quantity: 1
  },
  {
    type: 'delivery',
    id: 'delivery_postal',
    name: 'Nom traduit de la livraison',
    quantity: 1
  },
  {
    type: 'additional_signatories',
    id: 'additional_signatories',
    name: 'Nom traduit des signataires',
    quantity: 2
  }
]
```

### Structure de `localizedNames`

```typescript
{
  'service_<service_id>': 'Nom traduit du service (X document(s))',
  'option_<option_id>': 'Nom traduit de l\'option',
  'delivery_postal': 'Nom traduit de la livraison',
  'additional_signatories': 'Nom traduit des signataires'
}
```

## Code à modifier dans l'Edge Function

### 1. Récupérer les libellés traduits

```typescript
const language = formData.language || 'en';
const localizedNames = formData.localizedNames || {};
const localizedLineItems = formData.localizedLineItems || [];
```

### 2. Utiliser les libellés traduits lors de la création des line items Stripe

**Pour les services :**

```typescript
// Au lieu de :
lineItems.push({
  price_data: {
    currency: currency.toLowerCase(),
    product_data: {
      name: service.name, // ❌ Nom en anglais depuis la DB
    },
    unit_amount: servicePriceInCents,
  },
  quantity: documents.length,
});

// Utiliser :
const localizedName = localizedNames[`service_${serviceId}`] || service.name;
lineItems.push({
  price_data: {
    currency: currency.toLowerCase(),
    product_data: {
      name: localizedName, // ✅ Nom traduit depuis le frontend
    },
    unit_amount: servicePriceInCents,
  },
  quantity: documents.length,
});
```

**Pour les options :**

```typescript
// Au lieu de :
lineItems.push({
  price_data: {
    currency: currency.toLowerCase(),
    product_data: {
      name: option.name, // ❌ Nom en anglais depuis la DB
    },
    unit_amount: optionPriceInCents,
  },
  quantity: 1,
});

// Utiliser :
const localizedName = localizedNames[`option_${optionId}`] || option.name;
lineItems.push({
  price_data: {
    currency: currency.toLowerCase(),
    product_data: {
      name: localizedName, // ✅ Nom traduit depuis le frontend
    },
    unit_amount: optionPriceInCents,
  },
  quantity: 1,
});
```

**Pour la livraison postale :**

```typescript
if (formData.deliveryMethod === 'postal') {
  const localizedName = localizedNames['delivery_postal'] || 'Physical delivery (DHL Express)';
  lineItems.push({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: localizedName, // ✅ Nom traduit
      },
      unit_amount: deliveryPriceInCents,
    },
    quantity: 1,
  });
}
```

**Pour les signataires supplémentaires :**

```typescript
if (additionalSignatoriesCount > 0) {
  const localizedName = localizedNames['additional_signatories'] || 'Additional Signatories';
  lineItems.push({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: `${localizedName} (${additionalSignatoriesCount})`, // ✅ Nom traduit avec quantité
      },
      unit_amount: additionalSignatoriesCostInCents / additionalSignatoriesCount,
    },
    quantity: additionalSignatoriesCount,
  });
}
```

## Exemple complet

```typescript
// Dans la fonction create-checkout-session

const language = formData.language || 'en';
const localizedNames = formData.localizedNames || {};

// Pour chaque service sélectionné
formData.selectedServices.forEach(serviceId => {
  const service = await getServiceFromDB(serviceId);
  const documents = formData.serviceDocuments?.[serviceId] || [];
  
  if (service && documents.length > 0) {
    // Utiliser le nom traduit depuis localizedNames
    const localizedName = localizedNames[`service_${serviceId}`] || service.name;
    
    lineItems.push({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: localizedName, // ✅ Nom traduit
        },
        unit_amount: servicePriceInCents,
      },
      quantity: documents.length,
    });
  }
});

// Pour chaque option sélectionnée
// ... même logique avec localizedNames[`option_${optionId}`]
```

## Points importants

1. **Toujours utiliser `localizedNames` en priorité** : Si disponible, utiliser le nom traduit depuis `localizedNames`
2. **Fallback sur les noms de la DB** : Si le nom traduit n'est pas disponible, utiliser le nom depuis la base de données
3. **Format des noms** : Les noms traduits incluent déjà le format "(X document(s))" pour les services
4. **Langue** : La langue est disponible dans `formData.language` pour référence, mais les noms sont déjà traduits dans `localizedNames`

## Vérification

Pour vérifier que les libellés traduits sont bien utilisés :

1. Ouvrir la console du navigateur lors du checkout
2. Vérifier les logs `localizedLineItems` et `localizedNames` dans la requête envoyée à l'Edge Function
3. Vérifier que les noms dans le checkout Stripe correspondent aux noms traduits de l'interface


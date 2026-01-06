# Edge Function - Traitement des Signataires

## Problème
Les signataires supplémentaires ne sont pas ajoutés au checkout Stripe.

## Solution
L'Edge Function `create-checkout-session` doit traiter les signataires supplémentaires et les ajouter comme line items dans Stripe.

## Données reçues

L'Edge Function reçoit dans `formData` :
- `formData.signatories` : array de signataires
- `formData.signatoriesCount` : nombre total de signataires
- `formData.additionalSignatoriesCount` : nombre de signataires supplémentaires (total - 1, le premier est gratuit)
- `formData.additionalSignatoriesCost` : coût en EUR (additionalSignatoriesCount * 45)

## Code à ajouter dans l'Edge Function

```typescript
// Dans la fonction create-checkout-session, après le calcul des services et options :

// 1. Récupérer les données des signataires
const signatoriesCount = formData.signatoriesCount || 0;
const additionalSignatoriesCount = formData.additionalSignatoriesCount || 0;
const additionalSignatoriesCostEUR = formData.additionalSignatoriesCost || 0;

// 2. Si il y a des signataires supplémentaires, les ajouter au checkout
if (additionalSignatoriesCount > 0) {
  // Convertir le coût de EUR vers la devise cible si nécessaire
  let additionalSignatoriesCost = additionalSignatoriesCostEUR;
  
  if (currency !== 'EUR') {
    // Utiliser votre fonction de conversion de devise ici
    additionalSignatoriesCost = await convertCurrency(
      additionalSignatoriesCostEUR,
      'EUR',
      currency
    );
  }
  
  // Convertir en cents pour Stripe
  const additionalSignatoriesCostInCents = Math.round(additionalSignatoriesCost * 100);
  
  // Ajouter au total
  totalAmount += additionalSignatoriesCostInCents;
  
  // Créer le line item Stripe
  lineItems.push({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: `Additional Signatories (${additionalSignatoriesCount})`,
        description: `Additional signatories: ${additionalSignatoriesCount} × 45€`,
      },
      unit_amount: additionalSignatoriesCostInCents / additionalSignatoriesCount, // Prix unitaire
    },
    quantity: additionalSignatoriesCount,
  });
  
  // OU si vous utilisez des prix prédéfinis dans Stripe :
  // lineItems.push({
  //   price: 'price_xxxxx', // ID du prix dans Stripe
  //   quantity: additionalSignatoriesCount,
  // });
}
```

## Exemple

Si l'utilisateur a 2 signataires :
- `signatoriesCount` = 2
- `additionalSignatoriesCount` = 1 (2 - 1)
- `additionalSignatoriesCost` = 45 (1 × 45)

Le line item Stripe devrait être :
- Nom : "Additional Signatories (1)"
- Montant unitaire : 45€ (ou équivalent dans la devise cible)
- Quantité : 1
- Total : 45€

## Points importants

1. Le premier signataire est **gratuit** (inclus)
2. Seuls les signataires supplémentaires sont facturés (45€ chacun)
3. Le coût doit être converti de EUR vers la devise cible si nécessaire
4. Le montant doit être converti en cents pour Stripe (multiplier par 100)
















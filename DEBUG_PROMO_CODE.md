# Guide de Débogage - Code Promo Stripe

## Vérification étape par étape

### 1. Vérifier que le code promo est envoyé depuis le frontend

Dans la console du navigateur, cherchez :
```
🎟️ [PROMO] Code promo envoyé au backend: TEST
```

Si vous ne voyez pas ce log ou si c'est "Aucun", le code promo n'est pas correctement passé depuis PriceDetails.

### 2. Vérifier que le code promo est reçu par le backend

Dans les logs Supabase (Edge Functions), cherchez :
```
🎟️ [PROMO] Code promo détecté: TEST
🎟️ [PROMO] body.promoCode: TEST
```

Si `body.promoCode` est `null` ou `undefined`, le code promo n'est pas correctement envoyé.

### 3. Vérifier que Stripe trouve le code promo

Dans les logs Supabase, cherchez :
```
🎟️ [PROMO] Résultat recherche promotion codes: { found: true, ... }
```

Si `found: false`, cela signifie que :
- **Aucun promotion code "TEST" n'existe dans Stripe**
- Vous devez créer un promotion code dans Stripe (voir STRIPE_PROMO_CODE_SETUP.md)

### 4. Vérifier que le discount est appliqué

Dans les logs Supabase, cherchez :
```
✅ [PROMO] Code promo appliqué via promotion code: TEST ID: promo_xxxxx
```

Ou :
```
🎟️ [PROMO] Session params avant création: { hasDiscounts: true, discounts: [...] }
```

### 5. Vérifier dans la session Stripe créée

Dans les logs Supabase, cherchez :
```
✅ [SESSION] Session créée: { hasDiscount: true, discounts: [...] }
```

## Solution rapide

Si le code promo n'est pas appliqué, la cause la plus probable est que **vous n'avez pas créé de promotion code dans Stripe**.

### Pour créer un promotion code dans Stripe :

1. Allez sur https://dashboard.stripe.com
2. Produits > Catalogue de produits > Bons de réduction
3. Cliquez sur votre coupon "TEST" (ID: j1Ylvg7y)
4. Dans la section "Codes promotionnels", cliquez sur "+" ou "Créer un code promotionnel"
5. Entrez "TEST" comme code
6. Cliquez sur "Créer"

Après cela, le code "TEST" devrait fonctionner.

## Test rapide

Pour tester si le code promo fonctionne :

1. Ouvrez la console du navigateur
2. Ajoutez un code promo dans PriceDetails
3. Vérifiez les logs :
   - Frontend : `🎟️ [PROMO] Code promo envoyé au backend`
   - Backend : `🎟️ [PROMO] Code promo détecté`
   - Backend : `🎟️ [PROMO] Résultat recherche promotion codes`
   - Backend : `✅ [PROMO] Code promo appliqué` OU `❌ NON`

Si vous voyez "❌ NON" dans les logs, le code promo n'a pas été trouvé dans Stripe.


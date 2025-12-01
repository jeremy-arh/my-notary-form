# Configuration des Codes Promo Stripe

## Problème courant

Si vous voyez le message "Invalid promo code" alors que le coupon existe dans Stripe, c'est probablement parce qu'aucun **promotion code** n'est associé au coupon.

## Différence entre Coupon et Promotion Code

Dans Stripe, il y a deux concepts distincts :

1. **Coupon** : La réduction elle-même (ex: 20% de réduction, 10€ de réduction)
2. **Promotion Code** : Le code alphanumérique que les utilisateurs saisissent (ex: "TEST", "PROMO2024")

Un coupon peut avoir plusieurs promotion codes associés, mais **il faut créer au moins un promotion code** pour que les utilisateurs puissent utiliser le coupon.

## Comment créer un Promotion Code dans Stripe

### Méthode 1 : Depuis le dashboard Stripe (Recommandé)

1. Connectez-vous à votre [dashboard Stripe](https://dashboard.stripe.com)
2. Allez dans **Produits** > **Catalogue de produits** > **Bons de réduction**
3. Cliquez sur le coupon pour lequel vous voulez créer un code promo (ex: "TEST")
4. Dans la section **"Codes promotionnels"**, cliquez sur le bouton **"+"** ou **"Créer un code promotionnel"**
5. Entrez le code que vous voulez (ex: "TEST")
6. Configurez les options :
   - **Code** : Le code que les utilisateurs saisiront (ex: "TEST")
   - **Limite d'utilisation** : Nombre maximum d'utilisations (optionnel)
   - **Date d'expiration** : Date d'expiration du code (optionnel)
7. Cliquez sur **"Créer"**

### Méthode 2 : Via l'API Stripe

```bash
curl https://api.stripe.com/v1/promotion_codes \
  -u sk_test_YOUR_SECRET_KEY: \
  -d "coupon=j1Ylvg7y" \
  -d "code=TEST"
```

Remplacez :
- `sk_test_YOUR_SECRET_KEY` par votre clé secrète Stripe
- `j1Ylvg7y` par l'ID de votre coupon
- `TEST` par le code que vous voulez créer

## Vérification

Après avoir créé le promotion code :

1. Retournez dans le dashboard Stripe
2. Allez dans votre coupon
3. Vous devriez voir le code promotionnel listé dans la section **"Codes promotionnels"**
4. Testez le code dans votre application

## Codes de test recommandés

Pour tester, créez des codes simples comme :
- `TEST`
- `PROMO20`
- `DISCOUNT10`

Assurez-vous que le code correspond exactement (sans espaces, mais la casse n'est pas importante - notre système convertit en majuscules automatiquement).

## Dépannage

### Le code n'est toujours pas reconnu

1. Vérifiez que le promotion code est **actif** dans Stripe
2. Vérifiez qu'il n'a pas atteint sa limite d'utilisation
3. Vérifiez qu'il n'est pas expiré
4. Vérifiez les logs de la fonction `validate-promo-code` dans Supabase

### Erreur "Promo code not found"

Cela signifie que :
- Le promotion code n'existe pas dans Stripe
- Le code saisi ne correspond pas exactement au code dans Stripe (vérifiez les espaces, caractères spéciaux)

### Le coupon existe mais le code ne fonctionne pas

C'est normal ! Il faut créer un **promotion code** associé au coupon. Un coupon seul ne peut pas être utilisé directement avec un code alphanumérique.


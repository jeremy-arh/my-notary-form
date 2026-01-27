# Sync Stripe Balance Transactions

Cette Edge Function synchronise les balance transactions Stripe dans la table `stripe_balance_transactions`.

## Configuration

1. Ajoutez votre clé secrète Stripe dans les secrets Supabase :
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   ```

2. Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont automatiquement disponibles dans les Edge Functions.

## Déploiement

```bash
supabase functions deploy sync-stripe-balance-transactions
```

## Utilisation

Appelez la fonction avec un token d'authentification :

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/sync-stripe-balance-transactions' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

Ou depuis le frontend :

```javascript
const { data, error } = await supabase.functions.invoke('sync-stripe-balance-transactions', {
  headers: {
    Authorization: `Bearer ${supabaseAnonKey}`,
  },
});
```

## Fonctionnement

- Récupère toutes les balance transactions de type "charge" depuis l'API Stripe
- Les insère ou met à jour dans la table `stripe_balance_transactions`
- Utilise `upsert` pour éviter les doublons (basé sur l'ID)
- Gère la pagination automatiquement pour récupérer toutes les transactions

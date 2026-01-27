# Stripe Webhook Handler

Cette Edge Function écoute les webhooks Stripe et synchronise automatiquement les balance transactions dans la table `stripe_balance_transactions`.

## Configuration

### 1. Configurer les secrets Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Déployer la fonction

```bash
supabase functions deploy stripe-webhook
```

### 3. Configurer le webhook dans Stripe Dashboard

1. Allez dans Stripe Dashboard > Developers > Webhooks
2. Cliquez sur "Add endpoint"
3. URL: `https://votre-projet.supabase.co/functions/v1/stripe-webhook`
4. Événements à écouter :
   - `balance_transaction.created`
   - `balance_transaction.updated`
   - `charge.succeeded` (optionnel, mais recommandé)
5. Copiez le "Signing secret" (commence par `whsec_`) et ajoutez-le dans Supabase Secrets comme `STRIPE_WEBHOOK_SECRET`

## Fonctionnement

- **balance_transaction.created** : Insère automatiquement les nouvelles transactions de type "charge"
- **balance_transaction.updated** : Met à jour les transactions existantes
- **charge.succeeded** : Insère également les charges réussies

Les transactions de type "payout" sont ignorées (ce sont des retraits, pas des revenus).

## Vérification

Après configuration, chaque nouvelle transaction Stripe sera automatiquement ajoutée à la table `stripe_balance_transactions` sans intervention manuelle.

Vous pouvez vérifier dans Stripe Dashboard > Webhooks que les événements sont bien reçus (statut 200).

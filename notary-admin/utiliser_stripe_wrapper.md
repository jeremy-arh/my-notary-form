# Utiliser le Wrapper Stripe de Supabase

## 🎯 Objectif

Utiliser directement la table `stripe.balance_transactions` du wrapper Stripe de Supabase au lieu de créer une table séparée.

## 📋 Étapes

### 1. Activer le Wrapper Stripe dans Supabase

Le wrapper Stripe doit être activé dans votre projet Supabase :

1. Allez dans **Supabase Dashboard** > **Database** > **Extensions**
2. Recherchez **"Stripe"** ou **"stripe"**
3. Activez l'extension si elle n'est pas déjà activée

OU via SQL :

```sql
-- Activer le wrapper Stripe (si disponible)
CREATE EXTENSION IF NOT EXISTS stripe;
```

### 2. Configurer la connexion Stripe

Le wrapper Stripe nécessite une configuration dans Supabase :

1. Allez dans **Supabase Dashboard** > **Settings** > **Integrations**
2. Trouvez **Stripe** et configurez votre clé API Stripe
3. Le wrapper synchronisera automatiquement les données

### 3. Créer une vue dans public pour accéder aux données

Une fois le wrapper activé et configuré, créez une vue dans `public` :

```sql
-- Créer une vue qui expose les balance transactions depuis le schéma stripe
CREATE OR REPLACE VIEW public.stripe_balance_transactions_view AS
SELECT 
  id,
  amount,
  net,
  fee,
  currency,
  created,
  description,
  type
FROM stripe.balance_transactions
WHERE type = 'charge';

-- Donner les permissions nécessaires
GRANT SELECT ON public.stripe_balance_transactions_view TO authenticated;
GRANT SELECT ON public.stripe_balance_transactions_view TO anon;
```

### 4. Modifier le code CashFlow.jsx

Dans `src/pages/admin/CashFlow.jsx`, modifiez `fetchStripeRevenues` pour utiliser la vue :

```javascript
const fetchStripeRevenues = async () => {
  try {
    // Utiliser la vue qui accède à stripe.balance_transactions
    const { data: balanceTransactions, error } = await supabase
      .from('stripe_balance_transactions_view')
      .select('id, amount, net, fee, currency, created, description, type')
      .order('created', { ascending: false })
      .limit(10000);
    
    // ... reste du code
  }
};
```

## ✅ Avantages

- ✅ Synchronisation automatique par Supabase
- ✅ Pas besoin de webhook ou de synchronisation manuelle
- ✅ Données toujours à jour
- ✅ Pas besoin de maintenir une table séparée

## ⚠️ Note

Le wrapper Stripe de Supabase peut ne pas être disponible dans tous les projets. Si vous ne trouvez pas l'option dans le Dashboard, vous devrez utiliser la méthode avec la table `public.stripe_balance_transactions` et le webhook.

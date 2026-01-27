# Configuration du Webhook Stripe pour Synchronisation Automatique

## 🎯 Objectif

Automatiser l'ajout des nouvelles transactions Stripe dans la table `stripe_balance_transactions` dès qu'elles sont créées.

## 📋 Étapes de Configuration

### 1. Déployer la fonction Edge

```bash
supabase functions deploy stripe-webhook
```

### 2. Configurer les secrets Supabase

Dans Supabase Dashboard > Settings > Edge Functions > Secrets, ajoutez :

- `STRIPE_SECRET_KEY` : Votre clé secrète Stripe (sk_test_... ou sk_live_...)
- `STRIPE_WEBHOOK_SECRET` : Le secret du webhook (sera obtenu à l'étape suivante)

### 3. Configurer le webhook dans Stripe Dashboard

1. Allez dans **Stripe Dashboard** > **Developers** > **Webhooks**
2. Cliquez sur **"Add endpoint"**
3. **URL** : `https://VOTRE-PROJET.supabase.co/functions/v1/stripe-webhook`
   - Remplacez `VOTRE-PROJET` par votre référence de projet Supabase
4. **Événements à écouter** :
   - ✅ `balance_transaction.created`
   - ✅ `balance_transaction.updated`
   - ✅ `charge.succeeded` (optionnel mais recommandé)
5. Cliquez sur **"Add endpoint"**
6. **Copiez le "Signing secret"** (commence par `whsec_`)
7. Ajoutez-le dans Supabase Secrets comme `STRIPE_WEBHOOK_SECRET`

### 4. Tester le webhook

1. Créez une transaction de test dans Stripe
2. Vérifiez dans Stripe Dashboard > Webhooks que l'événement a été envoyé (statut 200)
3. Vérifiez dans votre table `stripe_balance_transactions` que la transaction a été ajoutée

## ✅ Résultat

Une fois configuré, **chaque nouvelle transaction Stripe sera automatiquement ajoutée** à la table `public.stripe_balance_transactions` sans intervention manuelle.

## 🔍 Vérification

Pour vérifier que le webhook fonctionne :

```sql
-- Voir les dernières transactions ajoutées
SELECT * FROM public.stripe_balance_transactions 
ORDER BY created DESC 
LIMIT 10;
```

## ⚠️ Notes Importantes

- Les transactions de type **"payout"** sont ignorées (ce sont des retraits)
- Seules les transactions de type **"charge"** sont ajoutées
- Les transactions existantes sont mises à jour si elles changent
- Le webhook vérifie la signature Stripe pour la sécurité

## 🐛 Dépannage

Si le webhook ne fonctionne pas :

1. Vérifiez les logs dans Supabase Dashboard > Edge Functions > Logs
2. Vérifiez que les secrets sont correctement configurés
3. Vérifiez que l'URL du webhook est correcte dans Stripe Dashboard
4. Vérifiez que les événements sont bien sélectionnés dans Stripe Dashboard

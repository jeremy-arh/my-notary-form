# Étapes pour synchroniser les données Stripe

## Étape 1 : Remplacer la clé Stripe
Dans le fichier `sync_stripe_data.sql`, ligne 17, remplacez :
```sql
stripe_api_key TEXT := 'VOTRE_CLE_STRIPE_SECRETE';
```
par votre vraie clé Stripe :
```sql
stripe_api_key TEXT := 'sk_test_51...';  -- ou sk_live_... pour la production
```

## Étape 2 : Exécuter le script complet
1. Ouvrez `sync_stripe_data.sql` dans Supabase SQL Editor
2. **Sélectionnez TOUT le contenu** (Ctrl+A)
3. Cliquez sur **"Run"** ou appuyez sur **Ctrl+Enter**

Le script va :
- Activer l'extension `pg_net`
- Créer la fonction de synchronisation
- Appeler la fonction automatiquement
- Afficher le nombre de transactions synchronisées

## Étape 3 : Vérifier le résultat
Après l'exécution, vous devriez voir :
- Un message de succès avec le nombre de transactions synchronisées
- Le nombre total de transactions dans la table
- Les 10 dernières transactions

## Si ça ne fonctionne pas
Vérifiez :
1. ✅ La clé Stripe a bien été remplacée (pas de 'VOTRE_CLE_STRIPE_SECRETE')
2. ✅ La clé Stripe est valide (commence par `sk_test_` ou `sk_live_`)
3. ✅ Vous avez bien sélectionné TOUT le script avant de l'exécuter
4. ✅ Il n'y a pas d'erreurs dans les résultats

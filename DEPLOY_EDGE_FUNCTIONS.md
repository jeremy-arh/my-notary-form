# 🚀 Déploiement des Edge Functions

## ⚠️ IMPORTANT
Les modifications des Edge Functions ne sont PAS automatiques. Vous devez redéployer manuellement après chaque changement du code.

## 📋 Prérequis

1. **Supabase CLI installé** :
```bash
npm install -g supabase
```

2. **Connexion à votre projet Supabase** :
```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
```

Pour trouver votre `project-ref` :
- Allez sur https://supabase.com/dashboard
- Sélectionnez votre projet
- L'URL sera : `https://supabase.com/dashboard/project/[PROJECT_REF]`

## 🔧 Déployer les fonctions

### Déployer create-checkout-session (REQUIS pour fix client_id)
```bash
cd /home/user/my-notary-form
supabase functions deploy create-checkout-session
```

### Déployer verify-payment
```bash
supabase functions deploy verify-payment
```

### Déployer toutes les fonctions en une fois
```bash
supabase functions deploy
```

## ✅ Vérifier le déploiement

1. **Dans Supabase Dashboard** :
   - Allez dans `Edge Functions`
   - Vérifiez que les fonctions apparaissent
   - Cliquez sur une fonction pour voir les logs

2. **Tester la fonction** :
   - Remplissez un formulaire sur votre site
   - Vérifiez les logs dans Supabase Dashboard > Edge Functions > [nom fonction] > Logs

## 🐛 Problèmes actuels à résoudre

### ❌ Soumissions non liées au client
**Problème** : Les submissions n'apparaissent pas dans le dashboard du client

**Cause** : La fonction `create-checkout-session` utilise `userId` (auth.users.id) au lieu de `clientId` (client.id)

**Solution** : Redéployer `create-checkout-session` qui contient maintenant :
- Récupération/création de l'entrée dans la table `client`
- Utilisation de `client.id` pour `submission.client_id`

**Commande** :
```bash
supabase functions deploy create-checkout-session
```

## 📝 Logs et Debug

Voir les logs en temps réel :
```bash
supabase functions logs create-checkout-session
supabase functions logs verify-payment
```

Voir les logs dans le dashboard :
- Dashboard > Edge Functions > [fonction] > Logs

# 🚀 Guide de Déploiement Stripe Payment

Ce guide vous explique comment déployer l'intégration Stripe sur votre projet Supabase.

## ⚠️ Prérequis

Avant de commencer, assurez-vous d'avoir :

1. ✅ Un compte Supabase (https://supabase.com)
2. ✅ Un compte Stripe (https://stripe.com)
3. ✅ Node.js installé (v18 ou supérieur)
4. ✅ Un projet Supabase créé

---

## 📋 Étape 1 : Configuration Stripe

### 1.1 Obtenir vos clés API Stripe

1. Connectez-vous à votre [Dashboard Stripe](https://dashboard.stripe.com)
2. En mode **Test** (pour le développement) :
   - Allez dans `Développeurs` > `Clés API`
   - Copiez votre **Clé secrète** (commence par `sk_test_...`)
   - ⚠️ **Ne partagez JAMAIS cette clé publiquement !**

3. Pour la production :
   - Activez votre compte Stripe
   - Passez en mode **Production**
   - Utilisez la clé secrète de production (`sk_live_...`)

### 1.2 Activer Stripe Checkout

1. Dans le Dashboard Stripe, allez dans `Paramètres` > `Checkout`
2. Activez Stripe Checkout si ce n'est pas déjà fait
3. Configurez vos paramètres de branding (logo, couleurs, etc.)

---

## 📋 Étape 2 : Installation Supabase CLI

### 2.1 Installer Supabase CLI

```bash
# Via npm
npm install -g supabase

# Via Homebrew (macOS)
brew install supabase/tap/supabase

# Via Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2.2 Vérifier l'installation

```bash
supabase --version
```

Vous devriez voir la version installée (ex: `1.123.4`)

---

## 📋 Étape 3 : Lier votre projet Supabase

### 3.1 Obtenir votre Project Reference

1. Allez sur [app.supabase.com](https://app.supabase.com)
2. Ouvrez votre projet
3. Allez dans `Project Settings` > `General`
4. Copiez votre **Reference ID** (ex: `jlizwheftlnhoifbqeex`)

### 3.2 Se connecter et lier le projet

```bash
# Se connecter à Supabase
supabase login

# Lier votre projet (remplacez YOUR_PROJECT_REF)
cd /path/to/my-notary-form
supabase link --project-ref YOUR_PROJECT_REF
```

Vous serez invité à entrer votre mot de passe de base de données.

---

## 📋 Étape 4 : Configurer les secrets Stripe

### 4.1 Définir la clé secrète Stripe

```bash
# Remplacez sk_test_... par votre vraie clé Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjK...
```

### 4.2 Vérifier les secrets

```bash
supabase secrets list
```

Vous devriez voir `STRIPE_SECRET_KEY` dans la liste.

---

## 📋 Étape 5 : Déployer les Edge Functions

### 5.1 Déployer create-checkout-session

```bash
cd /path/to/my-notary-form
supabase functions deploy create-checkout-session
```

Attendez le message de succès :
```
✓ Deployed Function create-checkout-session
```

### 5.2 Déployer verify-payment

```bash
supabase functions deploy verify-payment
```

Attendez le message de succès :
```
✓ Deployed Function verify-payment
```

### 5.3 Vérifier le déploiement

```bash
supabase functions list
```

Vous devriez voir vos deux fonctions listées avec le statut `ACTIVE`.

---

## 📋 Étape 6 : Configurer l'URL de votre application

### 6.1 Dans Supabase

1. Allez dans `Authentication` > `URL Configuration`
2. Ajoutez vos URLs autorisées :
   - `http://localhost:5173` (développement)
   - `https://votre-domaine.com` (production)

### 6.2 Dans Stripe

1. Allez dans `Développeurs` > `Webhooks` (optionnel pour l'instant)
2. Plus tard, vous pourrez ajouter un webhook pour les notifications de paiement

---

## 📋 Étape 7 : Tester l'intégration

### 7.1 Démarrer votre application

```bash
cd client-dashboard
npm run dev
```

### 7.2 Tester un paiement

1. Remplissez le formulaire de notaire
2. Cliquez sur `Confirm & Pay`
3. Vous serez redirigé vers Stripe Checkout
4. Utilisez une carte de test :
   - **Numéro** : `4242 4242 4242 4242`
   - **Date** : N'importe quelle date future (ex: `12/25`)
   - **CVV** : N'importe quel 3 chiffres (ex: `123`)
   - **Nom** : N'importe quel nom
5. Complétez le paiement
6. Vous serez redirigé vers la page de succès

### 7.3 Vérifier dans Supabase

1. Allez dans `Table Editor` > `submissions`
2. Vous devriez voir votre nouvelle soumission avec :
   - `status` : `pending`
   - `data` : contenant les informations du paiement

---

## 🔍 Dépannage

### Erreur : "Edge Function returned a non-2xx status code"

**Causes possibles :**

1. **Les fonctions ne sont pas déployées**
   ```bash
   supabase functions list
   # Vérifiez que vos fonctions sont listées
   ```

2. **La clé Stripe n'est pas configurée**
   ```bash
   supabase secrets list
   # Vérifiez que STRIPE_SECRET_KEY est présent
   ```

3. **Mauvaise clé Stripe**
   - Vérifiez que vous utilisez la bonne clé (test vs production)
   - Vérifiez qu'il n'y a pas d'espaces dans la clé

### Erreur : "Project not linked"

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Voir les logs des Edge Functions

```bash
# Logs en temps réel
supabase functions logs create-checkout-session --follow

# Ou
supabase functions logs verify-payment --follow
```

---

## 🧪 Test en local (optionnel)

### Démarrer Supabase localement

```bash
# Démarrer tous les services Supabase en local
supabase start

# Servir les fonctions localement
supabase functions serve create-checkout-session --env-file supabase/functions/.env.local

# Dans un autre terminal
supabase functions serve verify-payment --env-file supabase/functions/.env.local
```

### Créer .env.local

Créez le fichier `supabase/functions/.env.local` :

```bash
STRIPE_SECRET_KEY=sk_test_votre_cle_ici
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=votre_anon_key_locale
SUPABASE_SERVICE_ROLE_KEY=votre_service_key_locale
```

---

## 🎯 Passage en production

### 1. Activer votre compte Stripe

1. Complétez les informations de votre entreprise
2. Activez votre compte

### 2. Utiliser les clés de production

```bash
# Remplacez par votre clé de production
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

### 3. Redéployer les fonctions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy verify-payment
```

### 4. Tester avec de vraies cartes

⚠️ En production, utilisez de vraies cartes. Les paiements seront réellement effectués !

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Consultez les logs : `supabase functions logs NOM_FONCTION --follow`
2. Vérifiez la documentation :
   - Supabase : https://supabase.com/docs/guides/functions
   - Stripe : https://stripe.com/docs/checkout/quickstart
3. Contactez le support si nécessaire

---

## ✅ Checklist finale

Avant de considérer le déploiement terminé, vérifiez :

- [ ] Supabase CLI installé et connecté
- [ ] Projet lié avec `supabase link`
- [ ] Clé secrète Stripe configurée
- [ ] Fonction `create-checkout-session` déployée
- [ ] Fonction `verify-payment` déployée
- [ ] Test de paiement réussi en mode test
- [ ] Soumission créée dans la base de données
- [ ] URLs configurées dans Supabase Auth
- [ ] Application fonctionne correctement

---

## 🎉 Félicitations !

Votre intégration Stripe est maintenant opérationnelle ! Les utilisateurs peuvent maintenant :

1. Remplir le formulaire de notaire
2. Être redirigés vers Stripe pour le paiement sécurisé
3. Recevoir une confirmation de paiement
4. Voir leur soumission dans le dashboard

Pour toute question ou problème, consultez les logs ou la documentation.

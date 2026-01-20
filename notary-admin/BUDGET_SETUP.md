# Configuration du Budget Total

## 📋 Vue d'ensemble

Le système de budget permet de définir un budget initial qui se met à jour automatiquement en fonction des coûts et des revenus. Le budget restant est calculé en temps réel selon la formule :

**Budget restant = Budget initial - Coûts totaux + Revenus**

## 🚀 Installation

### 1. Exécuter la migration SQL

Exécutez le fichier `supabase-budget-migration.sql` dans votre Supabase SQL Editor :

1. Ouvrez votre Supabase Dashboard
2. Allez dans "SQL Editor"
3. Copiez le contenu de `supabase-budget-migration.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur "Run" ou appuyez sur Ctrl+Enter

Cette migration crée :
- La table `budget` pour stocker le budget initial
- Un trigger pour mettre à jour automatiquement `updated_at`
- Les politiques RLS (Row Level Security) pour la sécurité
- Un budget par défaut à 0€

## 💡 Utilisation

### Configurer le budget initial

1. Dans la section **Trésorerie**, cliquez sur le bouton **"Configurer le budget"** en haut à droite
2. Entrez le montant du budget initial (en euros)
3. Optionnellement, ajoutez une description (ex: "Budget mensuel janvier 2026")
4. Cliquez sur **"Enregistrer"**

### Visualiser le budget restant

Le budget restant s'affiche automatiquement en haut de la section **Indicateurs Clés** :

- **Budget restant** : Montant disponible (vert si positif, rouge si négatif)
- **Budget initial** : Montant que vous avez défini
- **Utilisé** : Différence entre le budget initial et le budget restant
- **Pourcentage** : Pourcentage du budget initial restant

### Calcul automatique

Le budget restant est calculé automatiquement en temps réel :

- **Coûts soustraits** :
  - Coûts Google Ads
  - Versements aux notaires
  - Coûts des webservices
  - Autres coûts

- **Revenus ajoutés** :
  - Tous les revenus Stripe (paiements avec statut `paid`)

## 📊 Exemple

Si vous définissez un budget initial de **10 000€** :

- Coûts totaux sur la période : **3 000€**
- Revenus totaux sur la période : **5 000€**

**Budget restant = 10 000€ - 3 000€ + 5 000€ = 12 000€**

## 🔄 Mise à jour

Le budget se met à jour automatiquement lorsque :
- Vous ajoutez ou modifiez des coûts
- De nouveaux revenus sont enregistrés
- Vous changez la période d'affichage (mois personnalisé)

## ⚙️ Structure de la base de données

La table `budget` contient :
- `id` : Identifiant unique (UUID)
- `initial_budget` : Montant du budget initial (NUMERIC)
- `description` : Description optionnelle (TEXT)
- `created_at` : Date de création (TIMESTAMPTZ)
- `updated_at` : Date de dernière modification (TIMESTAMPTZ)

## 🔐 Sécurité

Les politiques RLS permettent :
- **Lecture** : Tous les utilisateurs peuvent voir le budget
- **Modification** : Seuls les utilisateurs authentifiés peuvent modifier le budget



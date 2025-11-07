# Dashboard Super Admin

Dashboard complet pour gérer l'ensemble de l'application notary-form.

## 🚀 Démarrage

Le dashboard admin fonctionne sur un port séparé (5174) pour permettre un déploiement sur un domaine différent.

```bash
cd notary-admin
npm install
npm run dev
```

Le dashboard sera accessible sur `http://localhost:5174`

## 📋 Fonctionnalités

### 1. Dashboard Analytics
- Vue d'ensemble complète avec statistiques
- Graphiques de soumissions et revenus (30 derniers jours)
- Distribution des statuts (graphique en camembert)
- Métriques clés : total soumissions, users, revenus, etc.

### 2. Users
- Liste de tous les utilisateurs
- Filtres par période (aujourd'hui, 7 jours, 30 jours)
- Recherche par email ou nom
- Statistiques d'inscription

### 3. Submissions
- Liste complète des soumissions
- Filtres par statut et recherche
- Détails complets de chaque soumission
- Modification du statut

### 4. Stripe Payments
- Tous les paiements Stripe
- Statistiques de revenus
- Filtres par statut et période
- Liens vers les factures Stripe

### 5. Blog Articles (CRUD)
- Créer, modifier, supprimer des articles
- Gestion des statuts (draft, published, archived)
- Images, catégories, tags
- SEO (meta title, description)

### 6. Services (CRUD)
- Créer, modifier, supprimer des services
- Gestion des prix, icônes, couleurs
- Activation/désactivation

### 7. Options (CRUD)
- Créer, modifier, supprimer des options
- Gestion des prix additionnels
- Activation/désactivation

## 🗄️ Base de données

### Migration requise

Avant d'utiliser le dashboard, exécutez la migration SQL pour la table `blog_posts` (si elle n'existe pas déjà) :

```sql
-- Voir le fichier supabase-blog-migration.sql à la racine du projet
```

Exécutez ce script dans votre Supabase SQL Editor.

## 🔐 Authentification

Le dashboard utilise l'authentification Supabase. Assurez-vous que :
1. Les variables d'environnement sont configurées dans `.env`
2. L'utilisateur a les permissions nécessaires pour accéder aux tables

## 📦 Dépendances

- `recharts` : Pour les graphiques
- `date-fns` : Pour le formatage des dates
- `@iconify/react` : Pour les icônes
- `@supabase/supabase-js` : Pour l'accès à la base de données

## 🎨 Structure

```
notary-admin/
├── src/
│   ├── pages/
│   │   └── admin/
│   │       ├── Dashboard.jsx      # Analytics complètes
│   │       ├── Users.jsx          # Liste des users
│   │       ├── Submissions.jsx    # Liste des soumissions
│   │       ├── StripePayments.jsx # Paiements Stripe
│   │       ├── BlogArticles.jsx   # CRUD articles
│   │       ├── Services.jsx       # CRUD services
│   │       └── Options.jsx        # CRUD options
│   └── components/
│       └── admin/
│           └── AdminLayout.jsx     # Layout avec sidebar
```

## 🚢 Déploiement

Le dashboard peut être déployé séparément sur un sous-domaine différent :
- Application principale : `app.votredomaine.com`
- Dashboard admin : `admin.votredomaine.com`

Configurez les variables d'environnement pour chaque déploiement.

## 📊 Données Stripe

Les données Stripe sont extraites depuis le champ `data.payment` de la table `submission`. Assurez-vous que les soumissions contiennent bien ces données après le paiement.

## ⚠️ Notes importantes

1. **Permissions** : Le dashboard nécessite des permissions élevées pour accéder à toutes les tables
2. **RLS** : Certaines tables peuvent nécessiter des ajustements de Row Level Security
3. **Service Role Key** : Pour certaines opérations admin, vous pourriez avoir besoin d'utiliser la service role key au lieu de l'anon key


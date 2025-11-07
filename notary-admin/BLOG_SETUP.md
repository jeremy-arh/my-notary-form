# Configuration de la section Blog

## ⚠️ Erreur "Erreur lors du chargement des articles"

Si vous voyez cette erreur, c'est que la table `blog_posts` n'existe pas encore dans votre base de données Supabase.

## 🔧 Solution : Exécuter la migration SQL

1. **Ouvrez votre Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Ouvrez le SQL Editor**
   - Dans le menu de gauche, cliquez sur "SQL Editor"

3. **Exécutez la migration**
   - Ouvrez le fichier `supabase-blog-migration.sql` à la racine du projet
   - Copiez tout le contenu
   - Collez-le dans le SQL Editor
   - Cliquez sur "Run" ou appuyez sur Ctrl+Enter

4. **Vérifiez que la table existe**
   - Allez dans "Table Editor"
   - Vous devriez voir la table `blog_posts`

## 📋 Contenu de la migration

La migration crée :
- La table `blog_posts` avec tous les champs nécessaires
- Les index pour améliorer les performances
- Le trigger pour `updated_at`
- Les politiques RLS (Row Level Security)

## ✅ Après la migration

Une fois la migration exécutée, rechargez la page Blog dans le dashboard admin. La section devrait fonctionner correctement.

## 🔐 Permissions

Les politiques RLS permettent :
- **Public** : Lecture des articles publiés uniquement
- **Authentifiés** : Accès complet (CRUD) pour les admins

Si vous avez besoin de restreindre l'accès aux admins uniquement, modifiez la politique RLS pour vérifier un rôle admin.


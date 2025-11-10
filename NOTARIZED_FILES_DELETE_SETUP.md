# Configuration de la suppression de fichiers notarisés

## Vue d'ensemble

La fonctionnalité de suppression de fichiers notarisés a été ajoutée aux dashboards **admin** et **notaire**. Les utilisateurs peuvent maintenant supprimer des fichiers notarisés qu'ils ont uploadés.

## Fonctionnalités

- **Dashboard Notaire** : Les notaires peuvent supprimer les fichiers qu'ils ont uploadés pour leurs soumissions assignées
- **Dashboard Admin** : Les admins peuvent supprimer tous les fichiers notarisés
- **Suppression complète** : La suppression supprime le fichier du storage Supabase ET de la base de données
- **Suppression en cascade** : Les commentaires associés au fichier sont automatiquement supprimés grâce à `ON DELETE CASCADE`

## Configuration requise

### 1. Exécuter le script SQL

Pour activer la fonctionnalité de suppression, vous devez exécuter le script SQL suivant dans l'éditeur SQL de Supabase :

**Fichier** : `supabase-notarized-files-delete-policies.sql`

Ce script ajoute les politiques RLS (Row Level Security) suivantes :

- **Notaries can delete their notarized files** : Permet aux notaires de supprimer les fichiers qu'ils ont uploadés pour leurs soumissions assignées
- **Admins can delete all notarized files** : Permet aux admins de supprimer tous les fichiers notarisés

### 2. Étapes d'exécution

1. Ouvrez le tableau de bord Supabase
2. Allez dans **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu du fichier `supabase-notarized-files-delete-policies.sql`
5. Exécutez la requête

### 3. Vérification

Après avoir exécuté le script, vérifiez que les politiques ont été créées :

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'notarized_files' 
AND policyname LIKE '%delete%';
```

Vous devriez voir deux politiques :
- `Notaries can delete their notarized files`
- `Admins can delete all notarized files`

## Utilisation

### Dashboard Notaire

1. Naviguez vers une soumission assignée
2. Allez dans l'onglet **"Notarized Files"**
3. Cliquez sur le bouton **🗑️ (icône poubelle)** à côté du fichier que vous souhaitez supprimer
4. Confirmez la suppression dans la boîte de dialogue

### Dashboard Admin

1. Naviguez vers une soumission
2. Allez dans l'onglet **"Notarized Documents"**
3. Cliquez sur le bouton **🗑️ (icône poubelle)** à côté du fichier que vous souhaitez supprimer
4. Confirmez la suppression dans la boîte de dialogue

## Comportement de la suppression

1. **Confirmation** : Une boîte de dialogue de confirmation apparaît avant la suppression
2. **Storage** : Le fichier est supprimé du bucket `submission-documents` dans Supabase Storage
3. **Base de données** : L'entrée est supprimée de la table `notarized_files`
4. **Commentaires** : Tous les commentaires associés au fichier sont automatiquement supprimés (grâce à `ON DELETE CASCADE`)
5. **Interface** : Le fichier disparaît immédiatement de l'interface après la suppression réussie

## Sécurité

- Les politiques RLS garantissent que :
  - Les notaires ne peuvent supprimer que les fichiers qu'ils ont uploadés
  - Les admins peuvent supprimer tous les fichiers
  - Les clients ne peuvent pas supprimer de fichiers (read-only)
- Une confirmation est requise avant chaque suppression
- Les erreurs sont gérées gracieusement (si la suppression du storage échoue, la suppression de la base de données continue)

## Dépannage

### Erreur : "permission denied"

Si vous obtenez une erreur "permission denied" lors de la suppression :

1. Vérifiez que les politiques RLS ont été correctement créées
2. Vérifiez que l'utilisateur actuel a les permissions appropriées (notaire assigné ou admin)
3. Vérifiez que la clé de service (`VITE_SUPABASE_SERVICE_ROLE_KEY`) est configurée pour le dashboard admin

### Erreur : "file not found" dans le storage

Si vous obtenez une erreur lors de la suppression du fichier du storage :

- La suppression de la base de données continuera même si la suppression du storage échoue
- Le fichier sera retiré de l'interface, mais pourrait rester dans le storage (vous pouvez le supprimer manuellement si nécessaire)

## Notes

- La suppression est **irréversible** - assurez-vous de bien vouloir supprimer le fichier avant de confirmer
- Les commentaires associés au fichier sont automatiquement supprimés
- Les notifications associées au fichier restent dans la base de données (elles ne sont pas supprimées automatiquement)


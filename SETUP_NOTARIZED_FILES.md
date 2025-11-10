# 🔧 Configuration des Fichiers Notarisés

## ⚠️ Erreur : Table 'notarized_files' not found

Si vous voyez l'erreur :
```
Could not find the table 'public.notarized_files' in the schema cache
```

Cela signifie que la migration SQL n'a pas encore été exécutée dans votre base de données Supabase.

## ✅ Solution : Exécuter la Migration SQL

### Étape 1 : Ouvrir Supabase Dashboard

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2 : Exécuter la Migration

1. Ouvrez le fichier `supabase-notarized-files-migration.sql` à la racine du projet
2. **Copiez tout le contenu** du fichier
3. Collez-le dans le SQL Editor de Supabase
4. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter` / `Cmd+Enter`)

### Étape 3 : Vérifier que les Tables Existent

Exécutez cette requête pour vérifier :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('notarized_files', 'file_comments');
```

Vous devriez voir 2 lignes retournées :
- `notarized_files`
- `file_comments`

### Étape 4 : Vérifier les Politiques RLS

Vérifiez que les politiques RLS ont été créées :

```sql
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('notarized_files', 'file_comments');
```

Vous devriez voir plusieurs politiques pour chaque table.

### Étape 5 : Rafraîchir le Cache PostgREST (si nécessaire)

Si après avoir exécuté la migration vous voyez toujours l'erreur, il se peut que le cache PostgREST doive être rafraîchi :

1. Dans Supabase Dashboard, allez dans **Settings** > **API**
2. Cliquez sur **Refresh Schema Cache** (si disponible)
3. Ou attendez quelques minutes pour que le cache se rafraîchisse automatiquement

## 🔍 Vérification Avancée

### Vérifier la Structure des Tables

```sql
-- Vérifier la structure de notarized_files
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notarized_files'
ORDER BY ordinal_position;

-- Vérifier la structure de file_comments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'file_comments'
ORDER BY ordinal_position;
```

### Vérifier les Index

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('notarized_files', 'file_comments');
```

## 🐛 Dépannage

### Erreur : "relation already exists"

Si vous voyez cette erreur, c'est que les tables existent déjà. La migration utilise `CREATE TABLE IF NOT EXISTS`, donc elle devrait être idempotente. Vous pouvez ignorer cette erreur.

### Erreur : "permission denied"

Si vous voyez une erreur de permission, vérifiez que vous êtes connecté en tant qu'administrateur dans Supabase Dashboard.

### Erreur : "column does not exist"

Si vous voyez une erreur concernant une colonne qui n'existe pas, vérifiez que :
1. La table `submission` existe et a la colonne `assigned_notary_id`
2. La table `notary` existe et a la colonne `id` et `user_id`
3. La table `client` existe et a la colonne `id` et `user_id`

### Le cache ne se rafraîchit pas

Si après avoir exécuté la migration, l'application ne reconnaît toujours pas les tables :

1. **Attendez 1-2 minutes** - Le cache PostgREST se rafraîchit automatiquement
2. **Rechargez l'application** - Fermez et rouvrez l'onglet du navigateur
3. **Vérifiez les logs** - Allez dans Supabase Dashboard > Logs > Postgres Logs pour voir s'il y a des erreurs

## ✅ Après la Migration

Une fois la migration exécutée avec succès :

1. **Rechargez l'application** dans votre navigateur
2. **Testez l'upload** d'un fichier notarisé dans une soumission
3. **Vérifiez les notifications** - Le client devrait recevoir une notification

## 📝 Notes Importantes

- La migration est **idempotente** - Vous pouvez l'exécuter plusieurs fois sans problème
- Les tables seront créées dans le schéma `public`
- Les politiques RLS sont activées par défaut pour la sécurité
- Les index sont créés automatiquement pour améliorer les performances

## 🔗 Liens Utiles

- [Documentation Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [Documentation RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Documentation PostgREST](https://postgrest.org/)


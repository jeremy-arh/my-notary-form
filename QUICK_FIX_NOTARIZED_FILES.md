# 🔧 Correction Rapide : Erreur Table 'notarized_files' Not Found

## ⚠️ Erreur

```
Error saving file metadata: 
code: "PGRST205"
message: "Could not find the table 'public.notarized_files' in the schema cache"
```

## ✅ Solution Immédiate

### Étape 1 : Exécuter la Migration SQL

1. **Ouvrez Supabase Dashboard** : https://app.supabase.com
2. **Sélectionnez votre projet**
3. **Allez dans SQL Editor** (menu de gauche)
4. **Ouvrez le fichier** `supabase-notarized-files-migration.sql` à la racine du projet
5. **Copiez tout le contenu** et **collez-le** dans le SQL Editor
6. **Cliquez sur Run** (ou `Ctrl+Enter` / `Cmd+Enter`)

### Étape 2 : Vérifier que les Tables Existent

Exécutez cette requête dans le SQL Editor :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('notarized_files', 'file_comments');
```

**Résultat attendu** : 2 lignes
- `notarized_files`
- `file_comments`

### Étape 3 : Attendre le Rafraîchissement du Cache

Le cache PostgREST peut prendre 1-2 minutes pour se rafraîchir. Si l'erreur persiste après avoir exécuté la migration :

1. **Attendez 1-2 minutes**
2. **Rechargez complètement l'application** (fermez et rouvrez l'onglet)
3. **Videz le cache du navigateur** si nécessaire

### Étape 4 : Tester à Nouveau

1. Ouvrez une soumission dans le dashboard notaire
2. Allez dans l'onglet "Notarized Files"
3. Essayez d'uploader un fichier

## 🔍 Vérification Avancée

Si vous voulez vérifier que tout est correct :

```sql
-- Vérifier la structure de la table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notarized_files'
ORDER BY ordinal_position;

-- Vérifier les politiques RLS
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'notarized_files';
```

## 📝 Notes

- La migration est **idempotente** - vous pouvez l'exécuter plusieurs fois
- Les tables seront créées dans le schéma `public`
- Le cache PostgREST se rafraîchit automatiquement (généralement en moins de 2 minutes)

## 🆘 Si Ça Ne Fonctionne Toujours Pas

1. **Vérifiez les logs** dans Supabase Dashboard > Logs > Postgres Logs
2. **Vérifiez les permissions** - assurez-vous d'être connecté en tant qu'admin
3. **Contactez le support** si le problème persiste après avoir suivi toutes les étapes


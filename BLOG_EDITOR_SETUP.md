# Configuration de l'éditeur de blog

## Modifications apportées

### 1. Page dédiée pour l'édition/création d'articles
- ✅ Remplacement du modal par une page dédiée (`BlogArticleEdit.jsx`)
- ✅ Navigation via React Router vers `/cms/blog/new` (création) ou `/cms/blog/:id` (édition)

### 2. Éditeur de texte riche
- ✅ Intégration de `@tiptap/react` pour l'édition de contenu en rich text (compatible React 19)
- ✅ Le contenu est sauvegardé en HTML dans la base de données
- ✅ Barre d'outils complète avec formatage, listes, alignement, images, liens, etc.

### 3. Upload d'images de couverture
- ✅ Upload d'images vers le bucket Supabase `blog-images`
- ✅ Prévisualisation de l'image après upload
- ✅ Validation du type de fichier (images uniquement)
- ✅ Limite de taille : 5MB maximum
- ✅ L'URL de l'image est automatiquement enregistrée dans le champ `cover_image_url`

## Configuration requise

### 1. Installer les dépendances

```bash
cd notary-admin
npm install --legacy-peer-deps
```

**Note** : Les dépendances incluent `@tiptap/react` et ses extensions, qui sont entièrement compatibles avec React 19. L'option `--legacy-peer-deps` est utilisée pour éviter d'éventuels conflits avec d'autres dépendances.

### 2. Créer le bucket Supabase Storage

#### Option A : Via l'interface Supabase Dashboard (recommandé)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Storage** > **Buckets**
4. Cliquez sur **New bucket**
5. Configurez le bucket :
   - **Name**: `blog-images`
   - **Public bucket**: ✅ Oui (pour permettre l'accès public aux images)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

#### Option B : Via SQL (nécessite l'extension storage)

Exécutez la migration SQL dans le SQL Editor de Supabase :

```sql
-- Voir le fichier: supabase/migrations/20250104_create_blog_images_bucket.sql
```

### 3. Configurer les politiques RLS (Row Level Security)

Après avoir créé le bucket, exécutez les politiques RLS dans le SQL Editor :

```sql
-- Permettre l'upload aux utilisateurs authentifiés
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload blog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images' AND
  (storage.foldername(name))[1] = 'blog-images'
);

-- Permettre la lecture publique des images
CREATE POLICY IF NOT EXISTS "Allow public read access to blog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog-images');

-- Permettre la mise à jour pour les utilisateurs authentifiés
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update blog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-images')
WITH CHECK (bucket_id = 'blog-images');

-- Permettre la suppression pour les utilisateurs authentifiés
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete blog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'blog-images');
```

## Utilisation

### Créer un nouvel article

1. Allez dans le dashboard admin > **CMS** > **Blog Posts**
2. Cliquez sur **Nouvel article**
3. Remplissez le formulaire :
   - **Titre** : Titre de l'article (requis)
   - **Contenu** : Utilisez l'éditeur rich text pour formater votre contenu
   - **Image de couverture** : Cliquez sur "Uploader une image" pour sélectionner une image
   - Configurez les autres champs (SEO, catégorie, tags, etc.)
4. Cliquez sur **Enregistrer**

### Modifier un article existant

1. Allez dans le dashboard admin > **CMS** > **Blog Posts**
2. Cliquez sur **Modifier** sur l'article souhaité
3. Modifiez les champs nécessaires
4. Cliquez sur **Enregistrer**

## Fonctionnalités de l'éditeur

L'éditeur rich text (`@tiptap/react`) permet de :
- ✅ Formater le texte (gras, italique, barré)
- ✅ Ajouter des titres (H1 à H3)
- ✅ Créer des listes (ordonnées et non ordonnées)
- ✅ Aligner le texte (gauche, centre, droite)
- ✅ Ajouter des liens
- ✅ Insérer des images dans le contenu
- ✅ Réinitialiser le formatage

Le contenu est sauvegardé en HTML dans la base de données, ce qui permet une grande flexibilité pour l'affichage sur le site web.

**Note** : Tiptap est un éditeur moderne et performant, entièrement compatible avec React 19, contrairement à react-quill qui utilise des API React obsolètes.

## Structure des fichiers

- `notary-admin/src/pages/admin/BlogArticleEdit.jsx` : Page d'édition/création d'articles
- `notary-admin/src/pages/admin/BlogArticles.jsx` : Liste des articles (modifié pour utiliser la navigation)
- `notary-admin/src/App.jsx` : Routes ajoutées pour `/cms/blog/new` et `/cms/blog/:id`
- `supabase/migrations/20250104_create_blog_images_bucket.sql` : Migration SQL pour le bucket

## Notes importantes

- Les images sont stockées dans le bucket `blog-images` de Supabase Storage
- Les images sont accessibles publiquement (bucket public)
- La taille maximale d'une image est de 5MB
- Seuls les types d'images suivants sont acceptés : JPEG, PNG, GIF, WebP
- Le contenu HTML généré par l'éditeur est directement sauvegardé dans la base de données


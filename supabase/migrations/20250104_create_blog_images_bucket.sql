-- Migration pour créer le bucket blog-images dans Supabase Storage
-- À exécuter dans Supabase SQL Editor ou via Supabase CLI

-- Note: La création de buckets se fait généralement via l'interface Supabase Dashboard
-- ou via l'API Storage. Cette migration documente la création du bucket.

-- Pour créer le bucket via SQL (nécessite l'extension storage), utilisez:
-- SELECT storage.create_bucket('blog-images', {
--   public: true,
--   file_size_limit: 5242880, -- 5MB
--   allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
-- });

-- Alternative: Créer le bucket via l'interface Supabase Dashboard
-- 1. Allez dans Storage > Buckets
-- 2. Cliquez sur "New bucket"
-- 3. Nom: blog-images
-- 4. Public bucket: Oui
-- 5. File size limit: 5MB
-- 6. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- Politique RLS pour permettre l'upload aux utilisateurs authentifiés
-- (À exécuter après la création du bucket)

-- Permettre l'insertion (upload) pour les utilisateurs authentifiés
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





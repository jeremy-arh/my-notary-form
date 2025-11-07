-- Migration pour ajouter la table blog_posts
-- À exécuter dans Supabase SQL Editor
-- Note: Si la table existe déjà, cette migration est idempotente

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  meta_title VARCHAR(255),
  meta_description TEXT,
  tags TEXT[],
  category VARCHAR(100),
  views INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

-- Trigger pour updated_at (la fonction doit exister, voir supabase-schema.sql)
-- Si la fonction n'existe pas, exécutez d'abord cette partie de supabase-schema.sql
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Allow public read access to published articles" ON blog_posts;
DROP POLICY IF EXISTS "Allow authenticated users full access to blog_posts" ON blog_posts;

-- Permettre la lecture publique des articles publiés
CREATE POLICY "Allow public read access to published articles" ON blog_posts
  FOR SELECT USING (status = 'published');

-- Permettre aux admins de tout faire (INSERT, UPDATE, DELETE, SELECT)
-- Note: Ces politiques permettent à tous les utilisateurs authentifiés d'accéder
-- Pour plus de sécurité, vous pouvez restreindre avec auth.uid() ou un rôle admin
CREATE POLICY "Allow authenticated users full access to blog_posts" ON blog_posts
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE blog_posts IS 'Articles de blog pour le site';


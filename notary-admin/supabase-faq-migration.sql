-- ============================================================
-- Migration: Ajout des colonnes FAQ (JSONB) par langue
-- ============================================================
-- Structure FAQ: [{ "question": "...", "answer": "..." }, ...]
-- ============================================================

-- Colonne FAQ pour l'anglais (langue de base)
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb;

-- Colonnes FAQ pour les autres langues
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS faq_fr JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS faq_es JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS faq_de JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS faq_it JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS faq_pt JSONB DEFAULT '[]'::jsonb;

-- Commentaires pour documentation
COMMENT ON COLUMN public.blog_posts.faq IS 'FAQ en anglais (langue de base) - Format: [{"question": "...", "answer": "..."}]';
COMMENT ON COLUMN public.blog_posts.faq_fr IS 'FAQ en français';
COMMENT ON COLUMN public.blog_posts.faq_es IS 'FAQ en espagnol';
COMMENT ON COLUMN public.blog_posts.faq_de IS 'FAQ en allemand';
COMMENT ON COLUMN public.blog_posts.faq_it IS 'FAQ en italien';
COMMENT ON COLUMN public.blog_posts.faq_pt IS 'FAQ en portugais';


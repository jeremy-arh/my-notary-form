import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';

const BlogArticleEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image_url: '',
    cover_image_alt: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: [],
    canonical_url: '',
    category: '',
    tags: [],
    status: 'draft',
    published_at: '',
    views_count: 0,
    read_time_minutes: null,
    is_featured: false,
    featured_order: null,
    cta: ''
  });

  useEffect(() => {
    if (isEditing) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          cover_image_url: data.cover_image_url || '',
          cover_image_alt: data.cover_image_alt || '',
          meta_title: data.meta_title || '',
          meta_description: data.meta_description || '',
          meta_keywords: data.meta_keywords || [],
          canonical_url: data.canonical_url || '',
          category: data.category || '',
          tags: data.tags || [],
          status: data.status || 'draft',
          published_at: data.published_at ? new Date(data.published_at).toISOString().slice(0, 16) : '',
          views_count: data.views_count || 0,
          read_time_minutes: data.read_time_minutes || null,
          is_featured: data.is_featured || false,
          featured_order: data.featured_order || null,
          cta: data.cta || ''
        });
        setTagsInput((data.tags || []).join(', '));
        setKeywordsInput((data.meta_keywords || []).join(', '));
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      alert('Erreur lors du chargement de l\'article: ' + error.message);
      navigate('/cms');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${timestamp}.${fileExt}`;
      const filePath = `blog-images/${fileName}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      // Mettre à jour le formulaire avec l'URL
      setFormData({ ...formData, cover_image_url: urlData.publicUrl });

      alert('Image uploadée avec succès !');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors de l\'upload de l\'image: ' + error.message);
    } finally {
      setUploadingImage(false);
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Convertir les tags et keywords depuis les strings
      const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);

      const articleData = {
        ...formData,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        tags,
        meta_keywords: keywords,
        published_at: formData.status === 'published' && formData.published_at 
          ? new Date(formData.published_at).toISOString() 
          : (formData.status === 'published' && !isEditing 
            ? new Date().toISOString() 
            : formData.published_at || null),
        read_time_minutes: formData.read_time_minutes ? parseInt(formData.read_time_minutes) : null,
        featured_order: formData.featured_order ? parseInt(formData.featured_order) : null,
        views_count: parseInt(formData.views_count) || 0
      };

      // Supprimer les champs undefined ou vides
      Object.keys(articleData).forEach(key => {
        if (articleData[key] === undefined || articleData[key] === '') {
          delete articleData[key];
        }
      });

      if (isEditing) {
        const { error } = await supabase
          .from('blog_posts')
          .update(articleData)
          .eq('id', id);

        if (error) throw error;
        alert('Article modifié avec succès !');
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([articleData]);

        if (error) throw error;
        alert('Article créé avec succès !');
      }

      navigate('/cms');
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
    ],
    content: formData.content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== formData.content) {
        setFormData({ ...formData, content: html });
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (editor && formData.content !== editor.getHTML()) {
      editor.commands.setContent(formData.content || '');
    }
  }, [formData.content, editor]);

  if (loading && isEditing) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Modifier l\'article' : 'Nouvel article'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing ? 'Modifiez les informations de l\'article' : 'Créez un nouvel article de blog'}
            </p>
          </div>
          <button
            onClick={() => navigate('/cms')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
          >
            <Icon icon="heroicons:arrow-left" className="w-5 h-5 inline mr-2" />
            Retour
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          {/* Titre et Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Titre *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="Auto-généré si vide"
              />
            </div>
          </div>

          {/* Extrait */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Extrait</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              rows="3"
              placeholder="Résumé court de l'article..."
            />
          </div>

          {/* Contenu Rich Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Contenu *</label>
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              {/* Barre d'outils */}
              {editor && (
                <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
                    title="Gras"
                  >
                    <span className="font-bold text-sm">B</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
                    title="Italique"
                  >
                    <span className="italic text-sm">I</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-300' : ''}`}
                    title="Barré"
                  >
                    <span className="line-through text-sm">S</span>
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''}`}
                    title="Titre 1"
                  >
                    <span className="font-bold text-lg">H1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''}`}
                    title="Titre 2"
                  >
                    <span className="font-bold text-base">H2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''}`}
                    title="Titre 3"
                  >
                    <span className="font-bold text-sm">H3</span>
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
                    title="Liste à puces"
                  >
                    <Icon icon="heroicons:list-bullet" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
                    title="Liste numérotée"
                  >
                    <span className="text-sm font-semibold">1.</span>
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''}`}
                    title="Aligner à gauche"
                  >
                    <Icon icon="heroicons:align-left" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''}`}
                    title="Centrer"
                  >
                    <Icon icon="heroicons:align-center" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''}`}
                    title="Aligner à droite"
                  >
                    <Icon icon="heroicons:align-right" className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt('Entrez l\'URL du lien:');
                      if (url) {
                        editor.chain().focus().setLink({ href: url }).run();
                      }
                    }}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
                    title="Ajouter un lien"
                  >
                    <Icon icon="heroicons:link" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt('Entrez l\'URL de l\'image:');
                      if (url) {
                        editor.chain().focus().setImage({ src: url }).run();
                      }
                    }}
                    className="p-2 rounded hover:bg-gray-200"
                    title="Insérer une image"
                  >
                    <Icon icon="heroicons:photo" className="w-5 h-5" />
                  </button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetAllMarks().run()}
                    className="p-2 rounded hover:bg-gray-200"
                    title="Réinitialiser le formatage"
                  >
                    <Icon icon="heroicons:arrow-path" className="w-5 h-5" />
                  </button>
                </div>
              )}
              {/* Éditeur */}
              <div className="bg-white min-h-[400px] p-4 prose prose-sm max-w-none">
                <style>{`
                  .ProseMirror {
                    outline: none;
                    min-height: 400px;
                  }
                  .ProseMirror p {
                    margin: 0.5em 0;
                  }
                  .ProseMirror h1 {
                    font-size: 2em;
                    font-weight: bold;
                    margin: 0.5em 0;
                  }
                  .ProseMirror h2 {
                    font-size: 1.5em;
                    font-weight: bold;
                    margin: 0.5em 0;
                  }
                  .ProseMirror h3 {
                    font-size: 1.25em;
                    font-weight: bold;
                    margin: 0.5em 0;
                  }
                  .ProseMirror ul, .ProseMirror ol {
                    padding-left: 1.5em;
                    margin: 0.5em 0;
                  }
                  .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                  }
                  .ProseMirror a {
                    color: #2563eb;
                    text-decoration: underline;
                  }
                `}</style>
                <EditorContent editor={editor} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Le contenu est enregistré en HTML dans la base de données
            </p>
          </div>

          {/* Image de couverture */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Image de couverture</label>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="cover-image-upload"
                />
                <label
                  htmlFor="cover-image-upload"
                  className={`block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all text-center ${
                    uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploadingImage ? (
                    <span className="text-gray-600">
                      <Icon icon="heroicons:arrow-path" className="w-5 h-5 inline mr-2 animate-spin" />
                      Upload en cours...
                    </span>
                  ) : (
                    <span className="text-gray-700">
                      <Icon icon="heroicons:photo" className="w-5 h-5 inline mr-2" />
                      {formData.cover_image_url ? 'Changer l\'image' : 'Uploader une image'}
                    </span>
                  )}
                </label>
                {formData.cover_image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.cover_image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cover_image_url: '' })}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Supprimer l'image
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Texte alternatif image</label>
              <input
                type="text"
                value={formData.cover_image_alt}
                onChange={(e) => setFormData({ ...formData, cover_image_alt: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="Description de l'image pour l'accessibilité"
              />
            </div>
          </div>

          {/* SEO */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Title</label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  maxLength={255}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Description</label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  rows="2"
                  maxLength={320}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Keywords (séparés par des virgules)</label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Canonical URL</label>
                <input
                  type="text"
                  value={formData.canonical_url}
                  onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                />
              </div>
            </div>
          </div>

          {/* Catégorie et Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Catégorie</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Tags (séparés par des virgules)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          {/* Statut et Publication */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Date de publication</label>
              <input
                type="datetime-local"
                value={formData.published_at}
                onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Temps de lecture (minutes)</label>
              <input
                type="number"
                value={formData.read_time_minutes || ''}
                onChange={(e) => setFormData({ ...formData, read_time_minutes: e.target.value || null })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                min="1"
              />
            </div>
          </div>

          {/* Featured */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="ml-2 text-sm font-semibold text-gray-900">Article mis en avant</span>
              </label>
            </div>
            {formData.is_featured && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Ordre d'affichage</label>
                <input
                  type="number"
                  value={formData.featured_order || ''}
                  onChange={(e) => setFormData({ ...formData, featured_order: e.target.value || null })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  min="0"
                />
              </div>
            )}
          </div>

          {/* Stats et CTA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Nombre de vues</label>
              <input
                type="number"
                value={formData.views_count}
                onChange={(e) => setFormData({ ...formData, views_count: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">CTA (Call to Action)</label>
              <input
                type="text"
                value={formData.cta}
                onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={() => navigate('/cms')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BlogArticleEdit;


import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const BlogArticles = () => {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
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
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [articles, searchTerm, statusFilter]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching articles:', error);
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          alert('La table blog_posts n\'existe pas. Veuillez vérifier que la table existe dans votre base de données Supabase.');
        } else {
          alert('Erreur lors du chargement des articles: ' + error.message);
        }
        setArticles([]);
        return;
      }
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      alert('Erreur lors du chargement des articles: ' + (error.message || 'Erreur inconnue'));
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredArticles(filtered);
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setFormData({
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
    setTagsInput('');
    setKeywordsInput('');
    setIsModalOpen(true);
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title || '',
      slug: article.slug || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      cover_image_url: article.cover_image_url || '',
      cover_image_alt: article.cover_image_alt || '',
      meta_title: article.meta_title || '',
      meta_description: article.meta_description || '',
      meta_keywords: article.meta_keywords || [],
      canonical_url: article.canonical_url || '',
      category: article.category || '',
      tags: article.tags || [],
      status: article.status || 'draft',
      published_at: article.published_at ? new Date(article.published_at).toISOString().slice(0, 16) : '',
      views_count: article.views_count || 0,
      read_time_minutes: article.read_time_minutes || null,
      is_featured: article.is_featured || false,
      featured_order: article.featured_order || null,
      cta: article.cta || ''
    });
    setTagsInput((article.tags || []).join(', '));
    setKeywordsInput((article.meta_keywords || []).join(', '));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
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
          : (formData.status === 'published' && !editingArticle 
            ? new Date().toISOString() 
            : formData.published_at || null),
        read_time_minutes: formData.read_time_minutes ? parseInt(formData.read_time_minutes) : null,
        featured_order: formData.featured_order ? parseInt(formData.featured_order) : null,
        views_count: parseInt(formData.views_count) || 0
      };

      // Supprimer les champs undefined
      Object.keys(articleData).forEach(key => {
        if (articleData[key] === undefined || articleData[key] === '') {
          delete articleData[key];
        }
      });

      if (editingArticle) {
        const { error } = await supabase
          .from('blog_posts')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([articleData]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      published: 'bg-green-100 text-green-700',
      archived: 'bg-yellow-100 text-yellow-700'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status] || badges.draft}`}>
        {status?.toUpperCase() || 'DRAFT'}
      </span>
    );
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog Articles</h1>
            <p className="text-gray-600 mt-2">Gérer les articles de blog</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold"
          >
            <Icon icon="heroicons:plus" className="w-5 h-5 inline mr-2" />
            Nouvel article
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Recherche</label>
              <div className="relative">
                <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Rechercher par titre..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div key={article.id} className="bg-[#F3F4F6] rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {article.cover_image_url && (
                <img src={article.cover_image_url} alt={article.cover_image_alt || article.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  {getStatusBadge(article.status)}
                  {article.is_featured && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                      Featured
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{article.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>{formatDate(article.published_at || article.created_at)}</span>
                  <span>{article.views_count || 0} vues</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(article)}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-semibold"
                  >
                    <Icon icon="heroicons:pencil" className="w-4 h-4 inline mr-1" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                  >
                    <Icon icon="heroicons:trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12 bg-[#F3F4F6] rounded-2xl border border-gray-200">
            <p className="text-gray-600">Aucun article trouvé</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] overflow-y-auto p-6 my-8">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="space-y-6">
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
                />
              </div>

              {/* Contenu HTML */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Contenu * (HTML)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all font-mono text-sm"
                  rows="20"
                  placeholder="Entrez le contenu HTML ici. Vous pouvez utiliser toutes les balises HTML standard."
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Le contenu est enregistré en HTML. Utilisez les balises HTML standard (&lt;p&gt;, &lt;h1&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, etc.)
                </p>
              </div>

              {/* Images */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Image de couverture (URL)</label>
                  <input
                    type="text"
                    value={formData.cover_image_url}
                    onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Texte alternatif image</label>
                  <input
                    type="text"
                    value={formData.cover_image_alt}
                    onChange={(e) => setFormData({ ...formData, cover_image_alt: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
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
                  className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlogArticles;

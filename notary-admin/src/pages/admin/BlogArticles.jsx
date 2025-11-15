import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const BlogArticles = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
    navigate('/cms/blog/new');
  };

  const handleEdit = (article) => {
    navigate(`/cms/blog/${article.id}`);
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
    </>
  );
};

export default BlogArticles;

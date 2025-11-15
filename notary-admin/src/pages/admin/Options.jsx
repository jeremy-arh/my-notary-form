import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const Options = () => {
  const navigate = useNavigate();
  const [options, setOptions] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    filterOptions();
  }, [options, searchTerm]);

  const fetchOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('options')
        .select('*')
        .order('name', { ascending: true});

      if (error) throw error;
      setOptions(data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
      alert('Erreur lors du chargement des options');
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = () => {
    let filtered = options;

    if (searchTerm) {
      filtered = filtered.filter(o =>
        o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOptions(filtered);
  };

  const handleCreate = () => {
    navigate('/cms/option/new');
  };

  const handleEdit = (option) => {
    navigate(`/cms/option/${option.id}`);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette option ?')) return;

    try {
      const { error } = await supabase
        .from('options')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting option:', error);
        // Vérifier si c'est un problème de permissions RLS
        if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
          alert('Erreur de permissions : Vous n\'avez pas les droits pour supprimer cette option. Vérifiez les politiques RLS dans Supabase ou utilisez la SERVICE ROLE KEY.');
        } else {
          alert('Erreur lors de la suppression: ' + error.message);
        }
        return;
      }

      // Si pas d'erreur, la suppression a réussi
      fetchOptions();
    } catch (error) {
      console.error('Error deleting option:', error);
      alert('Erreur lors de la suppression: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const toggleActive = async (option) => {
    try {
      const { error } = await supabase
        .from('options')
        .update({ is_active: !option.is_active })
        .eq('id', option.id);

      if (error) throw error;
      fetchOptions();
    } catch (error) {
      console.error('Error toggling option:', error);
      alert('Erreur lors de la modification');
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Options</h1>
            <p className="text-gray-600 mt-2">Gérer les options de service</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold"
          >
            <Icon icon="heroicons:plus" className="w-5 h-5 inline mr-2" />
            Nouvelle option
          </button>
        </div>

        {/* Search */}
        <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-gray-200">
          <div className="relative">
            <Icon icon="heroicons:magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              placeholder="Rechercher une option..."
            />
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOptions.map((option) => (
            <div key={option.id} className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Icon icon={option.icon || 'heroicons:adjustments-horizontal'} className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(option)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      option.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {option.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{option.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{option.description}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-900">
                  +${parseFloat(option.additional_price || 0).toFixed(2)}
                </span>
                <span className="text-xs text-gray-500 font-mono">{option.option_id}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(option)}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-semibold"
                >
                  <Icon icon="heroicons:pencil" className="w-4 h-4 inline mr-1" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(option.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                >
                  <Icon icon="heroicons:trash" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredOptions.length === 0 && (
          <div className="text-center py-12 bg-[#F3F4F6] rounded-2xl border border-gray-200">
            <p className="text-gray-600">Aucune option trouvée</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Options;


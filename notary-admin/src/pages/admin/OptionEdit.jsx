import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';

const OptionEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    option_id: '',
    name: '',
    description: '',
    short_description: '',
    icon: '',
    additional_price: '',
    cta: 'Book an appointment',
    meta_title: '',
    meta_description: '',
    is_active: true
  });

  useEffect(() => {
    if (isEditing) {
      fetchOption();
    }
  }, [id]);

  const fetchOption = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('options')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          option_id: data.option_id || '',
          name: data.name || '',
          description: data.description || '',
          short_description: data.short_description || '',
          icon: data.icon || '',
          additional_price: data.additional_price || '',
          cta: data.cta || 'Book an appointment',
          meta_title: data.meta_title || '',
          meta_description: data.meta_description || '',
          is_active: data.is_active !== undefined ? data.is_active : true
        });
      }
    } catch (error) {
      console.error('Error fetching option:', error);
      alert('Erreur lors du chargement de l\'option: ' + error.message);
      navigate('/cms');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const optionData = {
        option_id: formData.option_id,
        name: formData.name,
        description: formData.description || null,
        icon: formData.icon || null,
        additional_price: parseFloat(formData.additional_price) || 0,
        is_active: formData.is_active
      };

      // Ajouter les champs optionnels seulement s'ils ont une valeur
      if (formData.short_description) optionData.short_description = formData.short_description;
      if (formData.cta) optionData.cta = formData.cta;
      if (formData.meta_title) optionData.meta_title = formData.meta_title;
      if (formData.meta_description) optionData.meta_description = formData.meta_description;

      if (isEditing) {
        const { error } = await supabase
          .from('options')
          .update(optionData)
          .eq('id', id);

        if (error) throw error;
        alert('Option modifiée avec succès !');
      } else {
        const { error } = await supabase
          .from('options')
          .insert([optionData]);

        if (error) throw error;
        alert('Option créée avec succès !');
      }

      navigate('/cms');
    } catch (error) {
      console.error('Error saving option:', error);
      if (error.message.includes('column') && error.message.includes('not found')) {
        alert('Erreur : Une colonne n\'existe pas dans la table. Vérifiez votre schéma de base de données. Erreur: ' + error.message);
      } else {
        alert('Erreur lors de la sauvegarde: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

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
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Modifier l\'option' : 'Nouvelle option'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing ? 'Modifiez les informations de l\'option' : 'Créez une nouvelle option'}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Option ID *</label>
              <input
                type="text"
                value={formData.option_id}
                onChange={(e) => setFormData({ ...formData, option_id: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="ex: urgent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Description courte</label>
            <textarea
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              rows="2"
              placeholder="Description courte pour les aperçus..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Icône (Iconify)</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              placeholder="ex: heroicons:bolt"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Prix additionnel ($) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.additional_price}
                onChange={(e) => setFormData({ ...formData, additional_price: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">CTA (Call to Action)</label>
              <input
                type="text"
                value={formData.cta}
                onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="Book an appointment"
              />
            </div>
          </div>

          {/* SEO Section */}
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
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Description</label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  rows="2"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="ml-2 text-sm font-semibold text-gray-900">Option active</span>
            </label>
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

export default OptionEdit;



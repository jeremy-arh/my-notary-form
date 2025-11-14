import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';

const Services = () => {
  const toast = useToast();
  const { confirm, ConfirmComponent } = useConfirm();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    service_id: '',
    name: '',
    description: '',
    short_description: '',
    icon: '',
    color: '',
    base_price: '',
    cta: 'Book an appointment',
    meta_title: '',
    meta_description: '',
    is_active: true
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Error loading services');
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services;

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredServices(filtered);
  };

  const handleCreate = () => {
    setEditingService(null);
    setFormData({
      service_id: '',
      name: '',
      description: '',
      short_description: '',
      icon: '',
      color: '',
      base_price: '',
      cta: 'Book an appointment',
      meta_title: '',
      meta_description: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      service_id: service.service_id || '',
      name: service.name || '',
      description: service.description || '',
      short_description: service.short_description || '',
      icon: service.icon || '',
      color: service.color || '',
      base_price: service.base_price || '',
      cta: service.cta || 'Book an appointment',
      meta_title: service.meta_title || '',
      meta_description: service.meta_description || '',
      is_active: service.is_active !== undefined ? service.is_active : true
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const serviceData = {
        ...formData,
        base_price: parseFloat(formData.base_price) || 0
      };

      // Supprimer les champs vides
      Object.keys(serviceData).forEach(key => {
        if (serviceData[key] === '' || serviceData[key] === undefined) {
          delete serviceData[key];
        }
      });

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('services')
          .insert([serviceData]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      // Vérifier si c'est un problème RLS
      if (error.code === '42501' || error.message.includes('row-level security')) {
        toast.error('RLS Error: Check that you are using the SERVICE ROLE KEY in your .env, or run the supabase-admin-rls-policies.sql script in Supabase.');
      } else {
        toast.error('Error saving: ' + error.message);
      }
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Service',
      message: 'Are you sure you want to delete this service?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error deleting service:', error);
        // Vérifier si c'est un problème de permissions RLS
        if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
          toast.error('Permission error: You do not have the rights to delete this service. Check RLS policies in Supabase.');
        } else {
          toast.error('Error deleting: ' + error.message);
        }
        return;
      }

      // Vérifier si la suppression a réussi
      if (data && data.length > 0) {
        toast.success('Service deleted successfully');
      } else {
        toast.warning('No service deleted. Check that the service exists and you have the necessary permissions.');
      }

      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Error deleting: ' + (error.message || 'Unknown error'));
    }
  };

  const toggleActive = async (service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;
      fetchServices();
    } catch (error) {
      console.error('Error toggling service:', error);
      toast.error('Error updating');
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
      <ConfirmComponent />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600 mt-2">Gérer les services disponibles</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold"
          >
            <Icon icon="heroicons:plus" className="w-5 h-5 inline mr-2" />
            Nouveau service
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
              placeholder="Rechercher un service..."
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-[#F3F4F6] rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${service.color || 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                  <Icon icon={service.icon || 'heroicons:document-text'} className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(service)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      service.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {service.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{service.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-900">
                  ${parseFloat(service.base_price || 0).toFixed(2)}
                </span>
                <span className="text-xs text-gray-500 font-mono">{service.service_id}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-semibold"
                >
                  <Icon icon="heroicons:pencil" className="w-4 h-4 inline mr-1" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                >
                  <Icon icon="heroicons:trash" className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12 bg-[#F3F4F6] rounded-2xl border border-gray-200">
            <p className="text-gray-600">Aucun service trouvé</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingService ? 'Modifier le service' : 'Nouveau service'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Icon icon="heroicons:x-mark" className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Service ID *</label>
                    <input
                      type="text"
                      value={formData.service_id}
                      onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                      placeholder="ex: notarization"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Icône (Iconify)</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                      placeholder="ex: heroicons:document-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Couleur (Tailwind)</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                      placeholder="ex: bg-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Prix de base ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
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
                    <span className="ml-2 text-sm font-semibold text-gray-900">Service actif</span>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
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

export default Services;


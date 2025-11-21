import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';
import AddressAutocomplete from '../../components/AddressAutocomplete';

const NotaryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    timezone: '',
    license_number: '',
    bio: '',
    iban: '',
    bic: '',
    bank_name: '',
    is_active: true
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  useEffect(() => {
    fetchServices();
    if (isEditing) {
      fetchNotary();
    }
  }, [id]);

  const fetchNotary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notary')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          full_name: data.full_name || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          country: data.country || '',
          timezone: data.timezone || '',
          license_number: data.license_number || '',
          bio: data.bio || '',
          iban: data.iban || '',
          bic: data.bic || '',
          bank_name: data.bank_name || '',
          is_active: data.is_active !== false
        });

        // Fetch notary services
        const { data: servicesData } = await supabase
          .from('notary_services')
          .select('service_id')
          .eq('notary_id', id);

        if (servicesData) {
          setSelectedServiceIds(servicesData.map(ns => ns.service_id));
        }
      }
    } catch (error) {
      console.error('Error fetching notary:', error);
      toast.error('Erreur lors du chargement du notaire: ' + error.message);
      navigate('/notary');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, service_id')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setAvailableServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleAddressSelect = (addressData) => {
    setFormData({
      ...formData,
      address: addressData.address || formData.address,
      city: addressData.city || formData.city,
      postal_code: addressData.postal_code || formData.postal_code,
      country: addressData.country || formData.country,
      timezone: addressData.timezone || formData.timezone
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validation
      if (!formData.full_name || !formData.email) {
        toast.warning('Veuillez remplir tous les champs requis (Nom complet et Email sont requis)');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.warning('Veuillez entrer une adresse email valide');
        return;
      }

      let notaryId;

      if (isEditing) {
        // Update existing notary
        const updateData = {
          name: formData.full_name,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          country: formData.country || null,
          timezone: formData.timezone || null,
          license_number: formData.license_number || null,
          bio: formData.bio || null,
          iban: formData.iban || null,
          bic: formData.bic || null,
          bank_name: formData.bank_name || null,
          is_active: formData.is_active !== false,
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('notary')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        
        notaryId = id;
        toast.success('Notaire modifié avec succès !');
      } else {
        // Create new notary
        const insertData = {
          name: formData.full_name,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          postal_code: formData.postal_code || null,
          country: formData.country || null,
          timezone: formData.timezone || null,
          license_number: formData.license_number || null,
          bio: formData.bio || null,
          iban: formData.iban || null,
          bic: formData.bic || null,
          bank_name: formData.bank_name || null,
          is_active: formData.is_active !== false
        };
        
        const { data, error } = await supabase
          .from('notary')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('❌ Insert error:', error);
          
          // Provide more helpful error messages
          if (error.code === '23505') {
            if (error.message.includes('email')) {
              throw new Error('Un notaire avec cet email existe déjà. Veuillez utiliser un email différent.');
            } else {
              throw new Error('Un notaire avec ces détails existe déjà.');
            }
          } else if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('policy')) {
            throw new Error('Permission refusée. Veuillez vérifier:\n1. La Service Role Key est configurée dans Cloudflare Pages\n2. Les politiques RLS autorisent les opérations admin\n3. Vous avez les privilèges admin');
          } else if (error.message.includes('column') && error.message.includes('does not exist')) {
            throw new Error(`Erreur de colonne de base de données: ${error.message}\n\nVeuillez exécuter les scripts de migration dans Supabase pour ajouter les colonnes manquantes.`);
          } else {
            throw new Error(`Échec de la création du notaire: ${error.message}\n\nCode d'erreur: ${error.code || 'inconnu'}`);
          }
        }
        
        notaryId = data.id;
        toast.success('Notaire créé avec succès ! Vous pouvez maintenant envoyer une invitation.');
      }

      // Update notary services
      if (notaryId) {
        // Delete existing services
        const { error: deleteError } = await supabase
          .from('notary_services')
          .delete()
          .eq('notary_id', notaryId);

        if (deleteError && isEditing) {
          console.warn('⚠️ Could not delete existing services:', deleteError);
        }

        // Insert new services
        if (selectedServiceIds.length > 0) {
          const notaryServices = selectedServiceIds.map(serviceId => ({
            notary_id: notaryId,
            service_id: serviceId
          }));

          const { error: insertError } = await supabase
            .from('notary_services')
            .insert(notaryServices)
            .select();

          if (insertError) {
            console.error('❌ Error inserting notary services:', insertError);
            throw new Error(`Échec de l'assignation des services: ${insertError.message}`);
          }
        }
      }

      navigate('/notary');
    } catch (error) {
      console.error('❌ Error saving notary:', error);
      const errorMessage = error.message || 'Une erreur inconnue s\'est produite';
      toast.error(`Erreur: ${errorMessage}. Veuillez vérifier: Tous les champs requis sont remplis, La Service Role Key est configurée, Le schéma de base de données est à jour, Les politiques RLS autorisent les opérations admin.`);
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
              {isEditing ? 'Modifier le notaire' : 'Nouveau notaire'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing ? 'Modifiez les informations du notaire' : 'Créez un nouveau notaire'}
            </p>
          </div>
          <button
            onClick={() => navigate('/notary')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
          >
            <Icon icon="heroicons:arrow-left" className="w-5 h-5 inline mr-2" />
            Retour
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Numéro de licence
              </label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Adresse *
              </label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                onAddressSelect={handleAddressSelect}
                placeholder="Commencez à taper une adresse..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Ville
              </label>
              <input
                type="text"
                value={formData.city}
                disabled
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                placeholder="Rempli automatiquement depuis l'adresse"
              />
              <p className="mt-1 text-xs text-gray-500">Rempli automatiquement depuis l'adresse</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Code postal
              </label>
              <input
                type="text"
                value={formData.postal_code}
                disabled
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                placeholder="Rempli automatiquement depuis l'adresse"
              />
              <p className="mt-1 text-xs text-gray-500">Rempli automatiquement depuis l'adresse</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Pays
              </label>
              <input
                type="text"
                value={formData.country}
                disabled
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                placeholder="Rempli automatiquement depuis l'adresse"
              />
              <p className="mt-1 text-xs text-gray-500">Rempli automatiquement depuis l'adresse</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Fuseau horaire *
              </label>
              <input
                type="text"
                value={formData.timezone}
                disabled
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                placeholder="Rempli automatiquement depuis l'adresse (fuseau horaire précis)"
              />
              <p className="mt-1 text-xs text-gray-500">Identifiant IANA - Rempli automatiquement depuis l'API Google Time Zone (précis basé sur les coordonnées)</p>
            </div>
          </div>

          {/* Banking Information */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations bancaires</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  BIC / SWIFT
                </label>
                <input
                  type="text"
                  value={formData.bic}
                  onChange={(e) => setFormData({ ...formData, bic: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="ABCDEFGH"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nom de la banque
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
                  placeholder="Nom de la banque"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Services compétents *
            </label>
            <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-white">
              {availableServices.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun service disponible</p>
              ) : (
                <div className="space-y-2">
                  {availableServices.map((service) => (
                    <label key={service.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServiceIds([...selectedServiceIds, service.id]);
                          } else {
                            setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                          }
                        }}
                        className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                      />
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Sélectionnez les services pour lesquels ce notaire est compétent</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all"
              placeholder="Notes internes sur le notaire (non visibles par le notaire)"
            />
            <p className="mt-1 text-xs text-gray-500">Notes internes - non visibles par le notaire</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
            />
            <label htmlFor="is_active" className="ml-2 text-sm font-semibold text-gray-900">
              Actif
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Créer')}
            </button>
            <button
              onClick={() => navigate('/notary')}
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

export default NotaryEdit;





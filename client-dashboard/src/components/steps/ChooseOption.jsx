import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const ChooseOption = ({ formData, updateFormData, nextStep }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true});

      if (error) throw error;

      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (serviceId) => {
    const currentServices = formData.selectedServices || [];
    const updatedServices = currentServices.includes(serviceId)
      ? currentServices.filter(id => id !== serviceId)
      : [...currentServices, serviceId];

    updateFormData({ selectedServices: updatedServices });
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 md:pt-10 pb-44 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Choose Your Services
            </h2>
            <p className="text-gray-600">
              Select one or more notary services you need
            </p>
          </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No services available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const isSelected = formData.selectedServices?.includes(service.service_id);
          return (
            <button
              key={service.service_id}
              type="button"
              onClick={() => toggleService(service.service_id)}
              className={`text-left p-6 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? 'border-black bg-white shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl ${service.color || 'bg-gray-100'}`}>
                  <Icon
                    icon={service.icon || 'heroicons:document-text'}
                    className="w-6 h-6 text-gray-600"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {service.name}
                    </h3>
                    {isSelected && (
                      <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                        <Icon
                          icon="heroicons:check"
                          className="w-4 h-4 text-white"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {service.short_description || service.description}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    from ${service.base_price?.toFixed(2)} per document
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      )}
        </div>
      </div>

      {/* Fixed Navigation - Desktop only */}
      <div className="hidden lg:block flex-shrink-0 px-4 py-4 bg-[#F3F4F6] lg:relative bottom-20 lg:bottom-auto left-0 right-0 z-50 lg:z-auto lg:border-t lg:border-gray-300">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={nextStep}
            disabled={!formData.selectedServices || formData.selectedServices.length === 0}
            className="btn-glassy px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default ChooseOption;

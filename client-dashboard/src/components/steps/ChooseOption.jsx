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
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pt-4 sm:pt-6 md:pt-10 pb-32 sm:pb-36 lg:pb-6" style={{ minHeight: 0 }}>
        <div className="space-y-4 sm:space-y-6 max-w-full">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              Choose Your Services
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Select one or more notary services you need
            </p>
          </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-black"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-gray-600">No services available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {services.map((service) => {
          const isSelected = formData.selectedServices?.includes(service.service_id);
          return (
            <button
              key={service.service_id}
              type="button"
              onClick={() => toggleService(service.service_id)}
              className={`text-left p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? 'border-black bg-white shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0 ${service.color || 'bg-gray-100'}`}>
                  <Icon
                    icon={service.icon || 'heroicons:document-text'}
                    className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 break-words flex-1 min-w-0">
                      {service.name}
                    </h3>
                    {isSelected && (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon
                          icon="heroicons:check"
                          className="w-3 h-3 sm:w-4 sm:h-4 text-white"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 break-words line-clamp-2">
                    {service.short_description || service.description}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">
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

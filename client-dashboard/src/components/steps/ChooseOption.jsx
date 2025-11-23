import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { 
  trackServiceSelected as trackAnalyticsServiceSelected,
  trackServicesSelectionCompleted 
} from '../../utils/analytics';
import { formatPrice } from '../../utils/currency';

const ChooseOption = ({ formData, updateFormData, nextStep, handleContinueClick, getValidationErrorMessage }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleContinue = () => {
    // Track services selection completed before continuing
    if (formData.selectedServices && formData.selectedServices.length > 0) {
      trackServicesSelectionCompleted(formData.selectedServices);
    }
    
    // Call original handleContinueClick or nextStep
    if (handleContinueClick) {
      handleContinueClick();
    } else {
      nextStep();
    }
  };

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
    const isAdding = !currentServices.includes(serviceId);
    const updatedServices = isAdding
      ? [...currentServices, serviceId]
      : currentServices.filter(id => id !== serviceId);

    updateFormData({ selectedServices: updatedServices });

    // Track service selection in analytics
    if (isAdding) {
      const service = services.find(s => s.service_id === serviceId);
      trackAnalyticsServiceSelected(
        serviceId,
        service?.name || serviceId,
        updatedServices.length,
        updatedServices
      );
    }
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-36 md:pb-6 lg:pb-6" style={{ minHeight: 0 }}>
        <div className="space-y-4 sm:space-y-6 md:space-y-8 max-w-full">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Choose Your Services
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              Select one or more notary services you need
            </p>
          </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-12 md:py-16">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 border-b-2 border-black"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 sm:py-12 md:py-16">
          <p className="text-sm sm:text-base md:text-lg text-gray-600">No services available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {services.map((service) => {
          const isSelected = formData.selectedServices?.includes(service.service_id);
          return (
            <button
              key={service.service_id}
              type="button"
              onClick={() => toggleService(service.service_id)}
              className={`text-left p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? 'border-black bg-white shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start space-x-3 sm:space-x-4 md:space-x-5">
                <div className={`p-2 sm:p-3 md:p-3.5 rounded-lg sm:rounded-xl flex-shrink-0 ${service.color || 'bg-gray-100'}`}>
                  <Icon
                    icon={service.icon || 'heroicons:document-text'}
                    className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-gray-600"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-900 break-words flex-1 min-w-0">
                      {service.name}
                    </h3>
                    {isSelected && (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon
                          icon="heroicons:check"
                          className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-1 sm:mb-2 break-words line-clamp-2">
                    {service.short_description || service.description}
                  </p>
                  <p className="text-xs sm:text-sm md:text-base font-semibold text-gray-900">
                    from {formatPrice(service.base_price || 0)} per document
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
      <div className="hidden xl:block flex-shrink-0 px-4 py-4 bg-[#F3F4F6] xl:relative bottom-20 xl:bottom-auto left-0 right-0 z-50 xl:z-auto xl:border-t xl:border-gray-300">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            className={`btn-glassy px-8 py-3 text-white font-semibold rounded-full transition-all ${
              !formData.selectedServices || formData.selectedServices.length === 0
                ? 'opacity-50 hover:opacity-70 active:opacity-90'
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default ChooseOption;

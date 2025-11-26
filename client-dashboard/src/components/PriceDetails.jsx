import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../utils/currency';

const PriceDetails = ({ formData, isOpen: controlledIsOpen, onToggle }) => {
  const [services, setServices] = useState([]);
  const [servicesMap, setServicesMap] = useState({});
  const [options, setOptions] = useState([]);
  const [optionsMap, setOptionsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  
  // Use controlled state if provided, otherwise use internal state
  const isPriceDetailsOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsPriceDetailsOpen = onToggle || setInternalIsOpen;

  useEffect(() => {
    fetchServices();
    fetchOptions();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      setServices(data);

      // Create a map of service_id to service object
      const map = {};
      data.forEach(service => {
        map[service.service_id] = service;
      });
      setServicesMap(map);
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
      setServicesMap({});
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const { data, error} = await supabase
        .from('options')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      setOptions(data || []);

      // Create a map of option_id to option object
      const map = {};
      (data || []).forEach(option => {
        map[option.option_id] = option;
      });
      setOptionsMap(map);
    } catch (error) {
      console.error('Error fetching options:', error);
      setOptions([]);
      setOptionsMap({});
    }
  };

  return (
    <div className="border-t border-gray-300 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="px-2 sm:px-3 pt-2.5 sm:pt-3">
        <button
          type="button"
          onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
          className="w-full flex items-center justify-between text-left hover:bg-gray-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Icon icon="heroicons:currency-dollar" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="text-xs sm:text-sm font-semibold text-gray-900">Price Details</span>
          </div>
          <Icon 
            icon={isPriceDetailsOpen ? "heroicons:chevron-up" : "heroicons:chevron-down"} 
            className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 font-bold transition-transform"
          />
        </button>
        
        {isPriceDetailsOpen && (
          <div className="mt-2 sm:mt-3 bg-white rounded-xl p-2 sm:p-3 border border-gray-200 max-h-[40vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {/* Services with file count pricing */}
                {formData.selectedServices && formData.selectedServices.length > 0 && (
                  <>
                    {formData.selectedServices.map((serviceId, index) => {
                      const service = servicesMap[serviceId];
                      if (!service) return null;

                      const documents = formData.serviceDocuments?.[serviceId] || [];
                      const serviceTotal = documents.length * (service.base_price || 0);

                      // Calculate options total for this service
                      const optionCounts = {}; // Track count per option

                      documents.forEach(doc => {
                        if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                          doc.selectedOptions.forEach(optionId => {
                            const option = optionsMap[optionId];
                            if (option) {
                              optionCounts[optionId] = (optionCounts[optionId] || 0) + 1;
                            }
                          });
                        }
                      });

                      return (
                        <div key={serviceId}>
                          <div
                            className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-1 ${index === 0 ? 'pb-1.5 sm:pb-2 border-b border-gray-200' : ''}`}
                          >
                            <span className="text-[10px] sm:text-xs text-gray-600 flex-1 min-w-0 break-words sm:truncate sm:pr-2">
                              {service.name} ({documents.length} document{documents.length > 1 ? 's' : ''})
                            </span>
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-900 flex-shrink-0">
                              {formatPrice(serviceTotal)}
                            </span>
                          </div>
                          {/* Show options breakdown */}
                          {Object.keys(optionCounts).length > 0 && (
                            <div className="ml-2 sm:ml-3 mt-1 sm:mt-1.5 space-y-0.5">
                              {Object.entries(optionCounts).map(([optionId, count]) => {
                                const option = optionsMap[optionId];
                                if (!option) return null;
                                const optionTotal = count * (option.additional_price || 0);
                                return (
                                  <div key={optionId} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5">
                                    <span className="text-[9px] sm:text-[10px] text-gray-500 italic break-words">
                                      + {option.name} ({count} document{count > 1 ? 's' : ''})
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-700 flex-shrink-0">
                                      {formatPrice(optionTotal)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Show signatories breakdown - global for all services */}
                {formData.signatoryCount && formData.signatoryCount > 1 && (
                  <div className="pt-1.5 sm:pt-2 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5">
                      <span className="text-[9px] sm:text-[10px] text-gray-500 italic break-words">
                        + Additional Signatories ({formData.signatoryCount - 1} signatory{(formData.signatoryCount - 1) > 1 ? 'ies' : ''})
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-semibold text-gray-700 flex-shrink-0">
                        {formatPrice((formData.signatoryCount - 1) * 10)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-1.5 sm:pt-2 border-t-2 border-gray-300 gap-0.5 sm:gap-1">
                  <span className="text-xs sm:text-sm font-bold text-gray-900 flex-shrink-0">Total Amount</span>
                  <span className="text-sm sm:text-base font-bold text-gray-900 flex-shrink-0">
                    {(() => {
                      let total = 0;
                      // Calculate total from selected services × files + options
                      if (formData.selectedServices) {
                        formData.selectedServices.forEach(serviceId => {
                          const service = servicesMap[serviceId];
                          const documents = formData.serviceDocuments?.[serviceId] || [];
                          if (service) {
                            // Add service cost
                            total += documents.length * (service.base_price || 0);

                            // Add options cost
                            documents.forEach(doc => {
                              if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                                doc.selectedOptions.forEach(optionId => {
                                  const option = optionsMap[optionId];
                                  if (option) {
                                    total += option.additional_price || 0;
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                      
                      // Add signatories cost (€10 per additional signatory) - global for all services
                      // Only add once, not per service
                      if (formData.signatoryCount && formData.signatoryCount > 1) {
                        total += (formData.signatoryCount - 1) * 10;
                      }
                      
                      return formatPrice(total);
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceDetails;


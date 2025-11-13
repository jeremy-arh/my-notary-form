import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';
import { trackBeginCheckout } from '../../utils/gtm';

const Summary = ({ formData, prevStep, handleSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [servicesMap, setServicesMap] = useState({});
  const [options, setOptions] = useState([]);
  const [optionsMap, setOptionsMap] = useState({});
  const [loading, setLoading] = useState(true);

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

  // Calculate checkout data for GTM begin_checkout event
  const calculateCheckoutData = () => {
    const items = [];
    let total = 0;

    if (formData.selectedServices && formData.selectedServices.length > 0) {
      formData.selectedServices.forEach(serviceId => {
        const service = servicesMap[serviceId];
        const documents = formData.serviceDocuments?.[serviceId] || [];
        
        if (service && documents.length > 0) {
          // Add service as item
          items.push({
            item_id: service.service_id || serviceId,
            item_name: service.name || serviceId,
            item_category: 'Notarization Service',
            price: service.base_price || 0,
            quantity: documents.length
          });

          // Add options as separate items
          documents.forEach(doc => {
            if (doc.selectedOptions && doc.selectedOptions.length > 0) {
              doc.selectedOptions.forEach(optionId => {
                const option = optionsMap[optionId];
                if (option) {
                  items.push({
                    item_id: option.option_id || optionId,
                    item_name: option.name || optionId,
                    item_category: 'Additional Service',
                    price: option.additional_price || 0,
                    quantity: 1
                  });
                }
              });
            }
          });
        }
      });

      // Calculate total
      formData.selectedServices.forEach(serviceId => {
        const service = servicesMap[serviceId];
        const documents = formData.serviceDocuments?.[serviceId] || [];
        if (service) {
          total += documents.length * (service.base_price || 0);
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

    return {
      currency: 'USD',
      value: total,
      items: items
    };
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Track begin_checkout event before submitting
      if (!loading && services.length > 0) {
        const checkoutData = calculateCheckoutData();
        trackBeginCheckout(checkoutData);
      }
      
      await handleSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not selected';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return 'Not selected';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-4 sm:pt-6 md:pt-10 pb-32 sm:pb-36 lg:pb-6">
        <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-full">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              Review Your Information
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-gray-600">
              Please review all details before submitting
            </p>
          </div>

      {/* Selected Services with Documents */}
      {formData.selectedServices && formData.selectedServices.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center">
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
              <Icon icon="heroicons:check-badge" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600" />
            </div>
            <span className="truncate">Selected Services</span>
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {formData.selectedServices.map((serviceId) => {
                const service = servicesMap[serviceId];
                const documents = formData.serviceDocuments?.[serviceId] || [];

                return (
                  <div key={serviceId} className="border border-gray-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4 overflow-hidden">
                    <div className="flex items-start space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon icon="heroicons:check" className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-900 break-words">{service?.name || serviceId}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 break-words">
                          {documents.length} document{documents.length > 1 ? 's' : ''} × ${service?.base_price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {documents.length > 0 && (
                      <div className="ml-7 sm:ml-9 space-y-1.5 sm:space-y-2">
                        {documents.map((doc, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-1.5 sm:p-2 bg-gray-50 rounded-lg gap-1.5 sm:gap-2">
                            <div className="flex items-center flex-1 min-w-0">
                              <Icon icon="heroicons:document" className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-1.5 sm:mr-2 text-gray-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs font-medium text-gray-900 truncate">{doc.name}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                              </div>
                            </div>
                            {doc.selectedOptions && doc.selectedOptions.length > 0 && (
                              <div className="flex flex-wrap gap-1 flex-shrink-0 ml-5 sm:ml-7 lg:ml-0">
                                {doc.selectedOptions.map(optionId => {
                                  const option = optionsMap[optionId];
                                  return option ? (
                                    <span key={optionId} className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] lg:text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                      <Icon icon={option.icon || "heroicons:check-badge"} className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 flex-shrink-0" />
                                      <span className="truncate max-w-[60px] sm:max-w-[80px] lg:max-w-none">{option.name}</span>
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Appointment Details */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
            <Icon icon="heroicons:calendar-days" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600" />
          </div>
          <span className="truncate">Appointment Details</span>
        </h3>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-600 flex-shrink-0">Date</span>
            <span className="text-[10px] sm:text-xs lg:text-sm text-gray-900 sm:text-right break-words">{formatDate(formData.appointmentDate)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-600 flex-shrink-0">Time</span>
            <span className="text-[10px] sm:text-xs lg:text-sm text-gray-900 sm:text-right">{formatTime(formData.appointmentTime)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-600 flex-shrink-0">Timezone</span>
            <span className="text-[10px] sm:text-xs lg:text-sm text-gray-900 sm:text-right break-words min-w-0">{formData.timezone || 'Not specified'}</span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
            <Icon icon="heroicons:user" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600" />
          </div>
          <span className="truncate">Personal Information</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Full Name</p>
            <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-words">
              {formData.firstName} {formData.lastName}
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Email</p>
            <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-all">{formData.email}</p>
          </div>
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Phone</p>
            <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-words">{formData.phone}</p>
          </div>
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Country</p>
            <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-words">{formData.country}</p>
          </div>
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl sm:col-span-2 overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Address</p>
            <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-words">
              {formData.address}, {formData.city}, {formData.postalCode}
            </p>
          </div>
          {formData.notes && (
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl sm:col-span-2 overflow-hidden">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Additional Notes</p>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-900 break-words">{formData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
            <Icon icon="heroicons:currency-dollar" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-600" />
          </div>
          <span className="truncate">Price Details</span>
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {/* Services with file count pricing */}
            {formData.selectedServices && formData.selectedServices.length > 0 && (
              <>
                {formData.selectedServices.map((serviceId, index) => {
                  const service = servicesMap[serviceId];
                  if (!service) return null;

                  const documents = formData.serviceDocuments?.[serviceId] || [];
                  const serviceTotal = documents.length * (service.base_price || 0);

                  // Calculate options total for this service
                  let optionsTotal = 0;
                  const optionCounts = {}; // Track count per option

                  documents.forEach(doc => {
                    if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                      doc.selectedOptions.forEach(optionId => {
                        const option = optionsMap[optionId];
                        if (option) {
                          optionsTotal += option.additional_price || 0;
                          optionCounts[optionId] = (optionCounts[optionId] || 0) + 1;
                        }
                      });
                    }
                  });

                  return (
                    <div key={serviceId}>
                      <div
                        className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 ${index === 0 ? 'pb-2 sm:pb-3 border-b border-gray-200' : ''}`}
                      >
                        <span className="text-[10px] sm:text-xs lg:text-sm text-gray-600 flex-1 min-w-0 break-words sm:truncate sm:pr-2">
                          {service.name} ({documents.length} document{documents.length > 1 ? 's' : ''})
                        </span>
                        <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-900 flex-shrink-0">
                          ${serviceTotal.toFixed(2)}
                        </span>
                      </div>
                      {/* Show options breakdown */}
                      {Object.keys(optionCounts).length > 0 && (
                        <div className="ml-3 sm:ml-4 mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
                          {Object.entries(optionCounts).map(([optionId, count]) => {
                            const option = optionsMap[optionId];
                            if (!option) return null;
                            const optionTotal = count * (option.additional_price || 0);
                            return (
                              <div key={optionId} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-1 lg:gap-2">
                                <span className="text-[9px] sm:text-[10px] lg:text-xs text-gray-500 italic break-words">
                                  + {option.name} ({count} document{count > 1 ? 's' : ''})
                                </span>
                                <span className="text-[9px] sm:text-[10px] lg:text-xs font-semibold text-gray-700 flex-shrink-0">
                                  ${optionTotal.toFixed(2)}
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

            {/* Total */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 sm:pt-3 border-t-2 border-gray-300 gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 flex-shrink-0">Total Amount</span>
              <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 flex-shrink-0">
                ${(() => {
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
                  console.log('💰 Summary Total:', total);
                  return total.toFixed(2);
                })()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Notice */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 lg:p-4 lg:p-6 overflow-hidden">
        <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
          <div className="flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <Icon icon="heroicons:information-circle" className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
          </div>
          <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0 flex-1">
            <h4 className="text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-900 mb-0.5 sm:mb-1">
              What happens next?
            </h4>
            <p className="text-[10px] sm:text-xs lg:text-sm text-gray-700 break-words">
              After submitting, you'll receive a confirmation email at <strong className="break-all">{formData.email}</strong>.
              Our team will review your request and contact you within 24 hours to confirm your appointment.
            </p>
          </div>
        </div>
      </div>
        </div>
      </div>

      {/* Fixed Navigation */}
      <div className="hidden lg:block flex-shrink-0 px-4 py-4 bg-[#F3F4F6] lg:relative bottom-20 lg:bottom-auto left-0 right-0 z-50 lg:z-auto lg:border-t lg:border-gray-300">
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={isSubmitting}
            className="btn-glassy-secondary px-6 md:px-8 py-3 text-gray-700 font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="btn-glassy px-6 md:px-8 py-3 text-white font-semibold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              'Complete Payment'
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Summary;

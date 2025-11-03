import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../../lib/supabase';

const Summary = ({ formData, prevStep, handleSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [servicesMap, setServicesMap] = useState({});
  const [apostilleService, setApostilleService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
    fetchApostilleService();
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

  const fetchApostilleService = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('service_id', '473fb677-4dd3-4766-8221-0250ea3440cd')
        .single();

      if (error) throw error;

      setApostilleService(data);
    } catch (error) {
      console.error('Error fetching apostille service:', error);
    }
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
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
      <div className="flex-1 overflow-y-auto px-4 pt-6 md:pt-10 pb-44 lg:pb-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Review Your Information
            </h2>
            <p className="text-gray-600">
              Please review all details before submitting
            </p>
          </div>

      {/* Selected Services with Documents */}
      {formData.selectedServices && formData.selectedServices.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Icon icon="heroicons:check-badge" className="w-5 h-5 text-gray-600" />
            </div>
            Selected Services
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.selectedServices.map((serviceId) => {
                const service = servicesMap[serviceId];
                const documents = formData.serviceDocuments?.[serviceId] || [];

                return (
                  <div key={serviceId} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon icon="heroicons:check" className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{service?.name || serviceId}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {documents.length} document{documents.length > 1 ? 's' : ''} × ${service?.base_price.toFixed(2)}
                          {(() => {
                            const apostilleCount = documents.filter(d => d.hasApostille).length;
                            if (apostilleCount > 0 && apostilleService) {
                              return ` + ${apostilleCount} apostille${apostilleCount > 1 ? 's' : ''} × $${apostilleService.base_price.toFixed(2)}`;
                            }
                            return '';
                          })()}
                        </p>
                      </div>
                    </div>

                    {documents.length > 0 && (
                      <div className="ml-9 space-y-2">
                        {documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center flex-1">
                              <Icon icon="heroicons:document" className="w-6 h-6 mr-2 text-gray-600" />
                              <div>
                                <p className="text-xs font-medium text-gray-900">{doc.name}</p>
                                <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                              </div>
                            </div>
                            {doc.hasApostille && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Icon icon="heroicons:check-badge" className="w-3 h-3 mr-1" />
                                Apostille
                              </span>
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
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <Icon icon="heroicons:calendar-days" className="w-5 h-5 text-gray-600" />
          </div>
          Appointment Details
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">Date</span>
            <span className="text-sm text-gray-900">{formatDate(formData.appointmentDate)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">Time</span>
            <span className="text-sm text-gray-900">{formatTime(formData.appointmentTime)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-600">Timezone</span>
            <span className="text-sm text-gray-900">{formData.timezone || 'Not specified'}</span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <Icon icon="heroicons:user" className="w-5 h-5 text-gray-600" />
          </div>
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Full Name</p>
            <p className="text-sm font-medium text-gray-900">
              {formData.firstName} {formData.lastName}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Email</p>
            <p className="text-sm font-medium text-gray-900">{formData.email}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Phone</p>
            <p className="text-sm font-medium text-gray-900">{formData.phone}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Country</p>
            <p className="text-sm font-medium text-gray-900">{formData.country}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl md:col-span-2">
            <p className="text-xs text-gray-600 mb-1">Address</p>
            <p className="text-sm font-medium text-gray-900">
              {formData.address}, {formData.city}, {formData.postalCode}
            </p>
          </div>
          {formData.notes && (
            <div className="p-3 bg-gray-50 rounded-xl md:col-span-2">
              <p className="text-xs text-gray-600 mb-1">Additional Notes</p>
              <p className="text-sm text-gray-900">{formData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <Icon icon="heroicons:currency-dollar" className="w-5 h-5 text-gray-600" />
          </div>
          Price Details
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Services with file count pricing */}
            {formData.selectedServices && formData.selectedServices.length > 0 && (
              <>
                {formData.selectedServices.map((serviceId, index) => {
                  const service = servicesMap[serviceId];
                  if (!service) return null;

                  const documents = formData.serviceDocuments?.[serviceId] || [];
                  const serviceTotal = documents.length * (service.base_price || 0);
                  const apostilleCount = documents.filter(d => d.hasApostille).length;
                  const apostilleTotal = apostilleCount * (apostilleService?.base_price || 0);
                  const combinedTotal = serviceTotal + apostilleTotal;

                  return (
                    <div key={serviceId}>
                      <div
                        className={`flex justify-between items-center ${index === 0 ? 'pb-3 border-b border-gray-200' : ''}`}
                      >
                        <span className="text-sm text-gray-600">
                          {service.name} ({documents.length} document{documents.length > 1 ? 's' : ''})
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${serviceTotal.toFixed(2)}
                        </span>
                      </div>
                      {apostilleCount > 0 && apostilleService && (
                        <div className="flex justify-between items-center mt-2 ml-4">
                          <span className="text-xs text-gray-500 italic">
                            + Apostille ({apostilleCount} document{apostilleCount > 1 ? 's' : ''})
                          </span>
                          <span className="text-xs font-semibold text-gray-700">
                            ${apostilleTotal.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
              <span className="text-base font-bold text-gray-900">Total Amount</span>
              <span className="text-xl font-bold text-gray-900">
                ${(() => {
                  let total = 0;
                  // Calculate total from selected services × files + apostilles
                  if (formData.selectedServices) {
                    formData.selectedServices.forEach(serviceId => {
                      const service = servicesMap[serviceId];
                      const documents = formData.serviceDocuments?.[serviceId] || [];
                      if (service) {
                        // Add service cost
                        total += documents.length * (service.base_price || 0);
                        // Add apostille cost
                        const apostilleCount = documents.filter(d => d.hasApostille).length;
                        if (apostilleCount > 0 && apostilleService) {
                          total += apostilleCount * apostilleService.base_price;
                        }
                      }
                    });
                  }
                  return total.toFixed(2);
                })()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Notice */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <Icon icon="heroicons:information-circle" className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="ml-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              What happens next?
            </h4>
            <p className="text-sm text-gray-700">
              After submitting, you'll receive a confirmation email at <strong>{formData.email}</strong>.
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
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Icon icon="heroicons:credit-card" className="w-5 h-5 mr-2" />
                Confirm & pay
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Summary;

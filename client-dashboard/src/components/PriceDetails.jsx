import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../hooks/useTranslation';
import { useServices } from '../contexts/ServicesContext';

const PriceDetails = ({ formData }) => {
  const { formatPriceSync, formatPrice: formatPriceAsync, currency, cacheVersion } = useCurrency();
  const { t } = useTranslation();
  const { servicesMap, optionsMap, loading } = useServices();
  const [forceUpdate, setForceUpdate] = useState(0);

  // Format price helper that uses the currency context
  // Use formatPriceSync directly - it uses the context cache
  const formatPrice = (eurAmount) => {
    return formatPriceSync(eurAmount);
  };


  // Preload conversions when currency changes or form data changes
  useEffect(() => {
    console.log('💰 [PriceDetails] Currency changed to:', currency);
    
    // Preload all prices that will be displayed
    const preloadPrices = async () => {
      const pricesToConvert = new Set();
      
      // Collect all prices from services
      if (formData.selectedServices) {
        formData.selectedServices.forEach(serviceId => {
          const service = servicesMap[serviceId];
          const documents = formData.serviceDocuments?.[serviceId] || [];
          if (service) {
            pricesToConvert.add(service.base_price || 0);
            
            // Collect option prices
            documents.forEach(doc => {
              if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                doc.selectedOptions.forEach(optionId => {
                  const option = optionsMap[optionId];
                  if (option) {
                    pricesToConvert.add(option.additional_price || 0);
                  }
                });
              }
            });
          }
        });
      }
      
      // Add signatory cost
      if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1) {
        pricesToConvert.add(45);
        // Also add total for additional signatories
        const additionalCount = formData.signatories.length - 1;
        pricesToConvert.add(additionalCount * 45);
      }
      
      // Add delivery postal cost if selected
      if (formData.deliveryMethod === 'postal') {
        pricesToConvert.add(49.95);
      }
      
      // Calculate and add total
      let total = 0;
      if (formData.selectedServices) {
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
      if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1) {
        total += (formData.signatories.length - 1) * 45;
      }
      if (formData.deliveryMethod === 'postal') {
        total += 49.95;
      }
      if (total > 0) {
        pricesToConvert.add(total);
      }
      
      // Convert all prices - this will update the context cache
      // Convert prices one by one and trigger re-render after each
      let completedCount = 0;
      const totalPrices = pricesToConvert.size;
      
      await Promise.all(
        Array.from(pricesToConvert).map(async (price) => {
          try {
            await formatPriceAsync(price);
            completedCount++;
            // Trigger re-render after each conversion to show updated prices immediately
            setForceUpdate(prev => prev + 1);
          } catch (error) {
            console.warn('Error converting price:', price, error);
            completedCount++;
          }
        })
      );
      
      // Final re-render after all conversions are done
      setForceUpdate(prev => prev + 1);
    };
    
    // Only preload if services are loaded and we have form data
    if (!loading && formData.selectedServices && formData.selectedServices.length > 0) {
      preloadPrices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, loading, formData.selectedServices, formData.serviceDocuments, formData.signatories, formData.deliveryMethod, servicesMap, optionsMap, formatPriceAsync]);

  // Calculate total amount
  const calculateTotal = () => {
    let total = 0;
    if (formData.selectedServices) {
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
    
    // Add cost for additional signatories (45€ per additional signatory, first one is free)
    if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1) {
      const additionalSignatories = formData.signatories.length - 1;
      total += additionalSignatories * 45;
    }

    // Add delivery postal cost if selected
    if (formData.deliveryMethod === 'postal') {
      total += 49.95;
    }
    
    return total;
  };



  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">
        {t('form.priceDetails.title')}
      </h3>
        
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div key={`prices-${currency}-${cacheVersion}-${forceUpdate}`} className="space-y-3 sm:space-y-4">
            {/* Documents à Certifier Section */}
            {formData.selectedServices && formData.selectedServices.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {formData.selectedServices.map((serviceId) => {
                  const service = servicesMap[serviceId];
                  if (!service) return null;

                  const documents = formData.serviceDocuments?.[serviceId] || [];
                  
                  return documents.map((doc, docIndex) => {
                    const servicePrice = service.base_price || 0;
                    const docOptions = doc.selectedOptions || [];
                    
                    // Calculate total for this document (service + options)
                    let docTotal = servicePrice;
                    docOptions.forEach(optionId => {
                      const option = optionsMap[optionId];
                      if (option) {
                        docTotal += option.additional_price || 0;
                      }
                    });

                    return (
                      <div key={`${serviceId}-${docIndex}`} className="border-b border-gray-200 pb-2 sm:pb-3 last:border-b-0 last:pb-0">
                        {/* Document name */}
                        <p className="text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">
                          {doc.name}
                        </p>
                        
                        {/* Service price */}
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs sm:text-sm text-gray-600">
                            {t('form.priceDetails.document') || '1x Certification Numérique'}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-gray-900">
                            {formatPrice(servicePrice)}
                          </span>
                        </div>
                        
                        {/* Options prices */}
                        {docOptions.map(optionId => {
                          const option = optionsMap[optionId];
                          if (!option) return null;
                          return (
                            <div key={optionId} className="flex justify-between items-center mb-1">
                              <span className="text-xs sm:text-sm text-gray-600">
                                {option.name}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                {formatPrice(option.additional_price || 0)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                }).flat()}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs sm:text-sm text-gray-500">
                  {t('form.priceDetails.noServices')}
                </p>
              </div>
            )}

            {/* Additional Signatories Cost */}
            {formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1 && (
              <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-gray-200">
                <span className="text-xs sm:text-sm text-gray-600">
                  {t('form.priceDetails.additionalSignatories') || 'Additional Signatories'} ({formData.signatories.length - 1} × {formatPrice(45)})
                </span>
                <span className="text-xs sm:text-sm font-semibold text-gray-900">
                  {formatPrice((formData.signatories.length - 1) * 45)}
                </span>
              </div>
            )}

            {/* Delivery postal cost */}
            {formData.deliveryMethod === 'postal' && (
              <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-gray-200">
                <span className="text-xs sm:text-sm text-gray-600">
                  {t('form.priceDetails.delivery') || 'Physical delivery (DHL Express)'}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-gray-900">
                  {formatPrice(49.95)}
                </span>
              </div>
            )}

            {/* Total - Always show even if 0 */}
            <div className="flex justify-between items-center pt-2 sm:pt-3 border-t-2 border-gray-300">
              <span className="text-sm sm:text-base font-semibold text-gray-900">
                {t('form.priceDetails.total')}
              </span>
              <span className="text-sm sm:text-base font-semibold text-gray-900">
                {formatPrice(calculateTotal())}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceDetails;



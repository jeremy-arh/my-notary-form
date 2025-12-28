import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { trackBeginCheckout } from '../../utils/gtm';
import { useTranslation } from '../../hooks/useTranslation';
import { useServices } from '../../contexts/ServicesContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import PriceDetails from '../PriceDetails';

const DELIVERY_POSTAL_PRICE_EUR = 49.95;

const Summary = ({ formData, prevStep, handleSubmit }) => {
  const { t, language } = useTranslation();
  const { servicesMap, optionsMap, loading } = useServices();
  const { formatPrice: formatPriceAsync, formatPriceSync, currency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [footerPadding, setFooterPadding] = useState(300);
  const [convertedDeliveryPrice, setConvertedDeliveryPrice] = useState('');

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate footer height and set padding dynamically to maintain 20px gap
  useEffect(() => {
    let resizeObserver = null;
    let checkInterval = null;
    let resizeHandler = null;
    
    const calculateFooterPadding = () => {
      const footer = document.querySelector('[data-footer="notary-form"]');
      if (footer && footer.offsetHeight > 0) {
        const footerHeight = footer.offsetHeight;
        const desiredGap = 20; // 20px gap
        const newPadding = footerHeight + desiredGap;
        setFooterPadding(newPadding);
        return true; // Footer found and measured
      }
      return false; // Footer not found or not yet rendered
    };

    // Try to find footer and set up observers
    const setupObservers = () => {
      const footer = document.querySelector('[data-footer="notary-form"]');
      if (footer && footer.offsetHeight > 0) {
        // Footer found, set up ResizeObserver
        if (!resizeObserver) {
          resizeObserver = new ResizeObserver(() => {
            calculateFooterPadding();
          });
          resizeObserver.observe(footer);
        }
        
        // Also observe window resize
        if (!resizeHandler) {
          resizeHandler = () => {
            calculateFooterPadding();
          };
          window.addEventListener('resize', resizeHandler);
        }
        
        // Calculate immediately
        calculateFooterPadding();
        
        return true;
      }
      return false;
    };

    // Initial attempt with delay to ensure DOM is ready
    const initialTimeout = setTimeout(() => {
      if (!setupObservers()) {
        // Footer not found yet, try periodically
        let attempts = 0;
        checkInterval = setInterval(() => {
          attempts++;
          if (setupObservers() || attempts >= 30) {
            clearInterval(checkInterval);
            if (attempts >= 30) {
              // Max attempts reached, use safe fallback
              setFooterPadding(300);
            }
          }
        }, 100);
      }
    }, 200);

    return () => {
      clearTimeout(initialTimeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
    };
  }, []);

  // Convert delivery price when currency changes
  useEffect(() => {
    const convertDeliveryPrice = async () => {
      if (formData.deliveryMethod === 'postal') {
        // Set initial price synchronously from cache if available
        const syncPrice = formatPriceSync(DELIVERY_POSTAL_PRICE_EUR);
        setConvertedDeliveryPrice(syncPrice);
        
        // Then convert asynchronously for accurate rate
        try {
          const formatted = await formatPriceAsync(DELIVERY_POSTAL_PRICE_EUR);
          setConvertedDeliveryPrice(formatted);
        } catch (error) {
          console.warn('Error converting delivery price:', error);
          // Keep the synchronous fallback
        }
      } else {
        setConvertedDeliveryPrice('');
      }
    };
    convertDeliveryPrice();
  }, [currency, formData.deliveryMethod, formatPriceAsync, formatPriceSync]);

  // Helper function to replace price in delivery description text
  const getDeliveryDescription = () => {
    const description = formData.deliveryMethod === 'postal'
      ? t('form.steps.delivery.postDescription')
      : t('form.steps.delivery.emailDescription');
    
    if (formData.deliveryMethod === 'postal' && convertedDeliveryPrice) {
      // Replace various price formats in the text (€49.95, 49,95 €, 49.95€, etc.)
      // This regex matches: optional € symbol, number with comma or dot, optional € symbol
      // Add a space after the converted price to ensure proper spacing before "for"
      return description.replace(
        /€?\s*\d+[.,]\d+\s*€?/gi,
        `${convertedDeliveryPrice} `
      ).replace(/\s+/g, ' ').trim(); // Normalize multiple spaces to single space
    }
    
    return description;
  };

  // Helper function to truncate file name on mobile
  const truncateFileName = (fileName) => {
    if (isMobile && fileName.length > 30) {
      const extension = fileName.substring(fileName.lastIndexOf('.'));
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      const truncatedName = nameWithoutExt.substring(0, 30 - extension.length - 3) + '...';
      return truncatedName + extension;
    }
    return fileName;
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

    // Add delivery method cost if postal delivery selected
    if (formData.deliveryMethod === 'postal') {
      total += DELIVERY_POSTAL_PRICE_EUR;
      items.push({
        item_id: 'delivery_postal',
        item_name: 'Physical Delivery (DHL Express)',
        item_category: 'Additional Service',
        price: DELIVERY_POSTAL_PRICE_EUR,
        quantity: 1
      });
    }

    // Add cost for additional signatories (45€ per additional signatory, first one is free)
    if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1) {
      const additionalSignatories = formData.signatories.length - 1;
      total += additionalSignatories * 45;
      
      // Add signatories as items for GTM
      items.push({
        item_id: 'additional_signatories',
        item_name: `Additional Signatories (${additionalSignatories})`,
        item_category: 'Additional Service',
        price: 45,
        quantity: additionalSignatories
      });
    }

    return {
      currency: formData.currency || 'EUR',
      value: total,
      items: items
    };
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Track begin_checkout event before submitting
      if (!loading && Object.keys(servicesMap).length > 0) {
        const checkoutData = calculateCheckoutData();
        trackBeginCheckout(checkoutData);
      }
      
      await handleSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('form.steps.summary.notSelected');
    const date = new Date(dateString + 'T00:00:00');
    const localeMap = {
      'en': 'en-US',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-PT',
    };
    return date.toLocaleDateString(localeMap[language] || 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return t('form.steps.summary.notSelected');
    // Simply display the time as stored, no conversion
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <div 
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 w-full max-w-full" 
      style={{ 
        minHeight: 0,
        paddingBottom: isMobile ? `${Math.max(footerPadding + 60, 350)}px` : `${footerPadding + 20}px`
      }}
    >
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t('form.steps.summary.title')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {t('form.steps.summary.subtitle')}
            </p>
          </div>

      {/* Selected Services with Documents */}
      {formData.selectedServices && formData.selectedServices.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            {t('form.steps.summary.services')}
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
                    <div className="mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-900 break-words">{service?.name || serviceId}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 break-words">
                          {documents.length} {documents.length > 1 ? t('form.steps.summary.documentPlural') : t('form.steps.summary.document')} × {formatPriceSync(service?.base_price || 0)}
                        </p>
                      </div>
                    </div>

                    {documents.length > 0 && (
                      <div className="space-y-1.5 sm:space-y-2">
                        {documents.map((doc, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-1.5 sm:p-2 bg-gray-50 rounded-lg gap-1.5 sm:gap-2">
                            <div className="flex items-center flex-1 min-w-0">
                              <Icon icon="heroicons:document" className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-1.5 sm:mr-2 text-gray-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs font-medium text-gray-900 truncate" title={doc.name}>{truncateFileName(doc.name)}</p>
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


      {/* Personal Information */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
          {t('form.steps.summary.personalInfo')}
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
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl sm:col-span-2 overflow-hidden">
            <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Address</p>
            <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-words">
              {formData.address}, {formData.city}, {formData.postalCode}
            </p>
          </div>
          {formData.notes && (
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl sm:col-span-2 overflow-hidden">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">{t('form.steps.summary.additionalNotes')}</p>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-900 break-words">{formData.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Method Summary */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
          {t('form.steps.summary.delivery') || 'Delivery'}
        </h3>
        <div className="flex items-start space-x-3 sm:space-x-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Icon
                icon={formData.deliveryMethod === 'postal' ? 'heroicons-envelope' : 'heroicons-envelope-open'}
                className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs sm:text-sm font-medium text-gray-900">
              {formData.deliveryMethod === 'postal'
                ? t('form.steps.delivery.postTitle')
                : t('form.steps.delivery.emailTitle')}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-600">
              {getDeliveryDescription()}
            </p>
            {formData.deliveryMethod === 'postal' && (
              <p className="text-[10px] sm:text-xs font-semibold text-gray-900 mt-1">
                {t('form.steps.summary.deliveryPrice') || 'Delivery cost'}: {convertedDeliveryPrice || formatPriceSync(DELIVERY_POSTAL_PRICE_EUR)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Signatories */}
      {formData.signatories && formData.signatories.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            {t('form.steps.summary.signatories') || 'Signatories'}
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {formData.signatories.map((signatory, index) => {
              const getInitials = (firstName, lastName) => {
                const first = firstName?.charAt(0)?.toUpperCase() || '';
                const last = lastName?.charAt(0)?.toUpperCase() || '';
                return first + last || '?';
              };
              
              return (
                <div key={signatory.id || index} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs sm:text-sm">
                      {getInitials(signatory.firstName, signatory.lastName)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 break-words">
                      {signatory.firstName} {signatory.lastName}
                      {index > 0 && (
                        <span className="ml-2 text-xs text-gray-600 font-normal">
                          (+{formatPriceSync(45)})
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600 break-all mt-0.5">
                      {signatory.email}
                    </p>
                    {signatory.phone && (
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                        {signatory.phone}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Details */}
      <PriceDetails 
        formData={formData} 
      />

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
              {t('form.steps.summary.confirmationMessage').replace('{email}', formData.email)}
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Summary;

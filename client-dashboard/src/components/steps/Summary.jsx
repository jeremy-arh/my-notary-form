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
      <div className="w-full mx-auto">
        {/* Header - Full width */}
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
            {t('form.steps.summary.title')}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            {t('form.steps.summary.subtitle')}
          </p>
        </div>

        {/* Two Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4 lg:space-y-6">

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
          </div>

          {/* Right Column - Price Details Sticky */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-4">
              {/* Price Details - Static Display */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 overflow-hidden shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="heroicons:currency-dollar" className="w-5 h-5 text-gray-600" />
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">{t('form.priceDetails.title')}</h3>
                </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Services with file count pricing */}
            {formData.selectedServices && formData.selectedServices.length > 0 ? (
              <>
                {formData.selectedServices.map((serviceId, index) => {
                  const service = servicesMap[serviceId];
                  if (!service) return null;

                  const documents = formData.serviceDocuments?.[serviceId] || [];
                  const serviceTotal = documents.length * (service.base_price || 0);

                  // Calculate options total for this service
                  const optionCounts = {};

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
                      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                        <span className="text-xs sm:text-sm text-gray-700">
                          {service.name} ({documents.length} {documents.length > 1 ? t('form.steps.summary.documentPlural') : t('form.steps.summary.document')})
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">
                          {formatPriceSync(serviceTotal)}
                        </span>
                      </div>
                      {/* Show options breakdown */}
                      {Object.keys(optionCounts).length > 0 && (
                        <div className="ml-4 mt-2 space-y-1">
                          {Object.entries(optionCounts).map(([optionId, count]) => {
                            const option = optionsMap[optionId];
                            if (!option) return null;
                            const optionTotal = count * (option.additional_price || 0);
                            return (
                              <div key={optionId} className="flex justify-between items-center">
                                <span className="text-[10px] sm:text-xs text-gray-500 italic">
                                  + {option.name} ({count} {count > 1 ? t('form.steps.summary.documentPlural') : t('form.steps.summary.document')})
                                </span>
                                <span className="text-[10px] sm:text-xs font-semibold text-gray-700">
                                  {formatPriceSync(optionTotal)}
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
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">No services selected</p>
              </div>
            )}

            {/* Delivery Cost */}
            {formData.deliveryMethod === 'postal' && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-xs sm:text-sm text-gray-700">
                  {t('form.steps.summary.delivery')}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-gray-900">
                  {convertedDeliveryPrice || formatPriceSync(DELIVERY_POSTAL_PRICE_EUR)}
                </span>
              </div>
            )}

            {/* Additional Signatories */}
            {formData.signatories && formData.signatories.length > 1 && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-xs sm:text-sm text-gray-500 italic">
                  + {t('form.priceDetails.additionalSignatories')} ({formData.signatories.length - 1})
                </span>
                <span className="text-xs sm:text-sm font-semibold text-gray-700">
                  {formatPriceSync((formData.signatories.length - 1) * 10)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
              <span className="text-sm sm:text-base font-bold text-gray-900">{t('form.priceDetails.total')}</span>
              <span className="text-base sm:text-lg font-bold text-gray-900">
                {formatPriceSync(
                  (formData.selectedServices?.reduce((total, serviceId) => {
                    const service = servicesMap[serviceId];
                    const documents = formData.serviceDocuments?.[serviceId] || [];
                    if (service) {
                      let serviceTotal = documents.length * (service.base_price || 0);
                      documents.forEach(doc => {
                        if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                          doc.selectedOptions.forEach(optionId => {
                            const option = optionsMap[optionId];
                            if (option) {
                              serviceTotal += option.additional_price || 0;
                            }
                          });
                        }
                      });
                      return total + serviceTotal;
                    }
                    return total;
                  }, 0) || 0) + 
                  (formData.deliveryMethod === 'postal' ? DELIVERY_POSTAL_PRICE_EUR : 0) +
                  (formData.signatories && formData.signatories.length > 1 ? (formData.signatories.length - 1) * 10 : 0)
                )}
              </span>
            </div>
          </div>
        )}
              </div>

              {/* What happens next */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 overflow-hidden mt-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <Icon icon="heroicons:information-circle" className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                      What happens next?
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-700 break-words">
                      {(() => {
                        const message = t('form.steps.summary.confirmationMessage');
                        const email = formData.email || 'your email';
                        
                        if (language === 'fr') {
                          // French: "Une fois le paiement effectué, vous recevrez instantanément un lien sécurisé sur votre mail {email} pour vérifier votre identité..."
                          return (
                            <>
                              Une fois le paiement effectué, <strong>vous recevrez instantanément un lien sécurisé sur votre mail {email}</strong> pour vérifier votre identité, puis rejoindre votre session vidéo avec un notaire certifié.
                            </>
                          );
                        } else {
                          // English: "Once payment is complete, you will instantly receive a secure link to your email {email} to verify..."
                          return (
                            <>
                              Once payment is complete, <strong>you will instantly receive a secure link to your email {email}</strong> to verify your identity, then join your video session with a certified notary.
                            </>
                          );
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Secure Payment by Stripe */}
              <div className="bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 overflow-hidden mt-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 60 25" fill="#635BFF" xmlns="http://www.w3.org/2000/svg">
                      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                      Secure payment by Stripe
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-600 break-words">
                      Your payment information is encrypted and processed securely through Stripe. <strong>We never store your card details.</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Icon icon="heroicons:shield-check" className="w-3 h-3 text-green-600" />
                        <span>SSL Encrypted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;

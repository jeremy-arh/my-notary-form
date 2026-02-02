import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabase';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../hooks/useTranslation';
import { useServices } from '../contexts/ServicesContext';
import { getServicePrice, getServicePriceCurrency, getOptionPrice, getOptionPriceCurrency } from '../utils/pricing';
import { convertPriceSync } from '../utils/currency';

const PriceDetails = ({ formData, isOpen: controlledIsOpen, onToggle }) => {
  const { formatPriceSync, formatPrice: formatPriceAsync, currency } = useCurrency();
  const { t } = useTranslation();
  const { servicesMap, optionsMap, loading, getServiceName, getOptionName } = useServices();
  const [services, setServices] = useState([]);
  const [options, setOptions] = useState([]);
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [priceCache, setPriceCache] = useState({});
  
  // Use controlled state if provided, otherwise use internal state
  const isPriceDetailsOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsPriceDetailsOpen = onToggle || setInternalIsOpen;

  // Format price helper that uses the currency context
  const formatPrice = (amount, sourceCurrency = 'EUR') => {
    // Check local cache first
    const cacheKey = `${amount}_${currency}_${sourceCurrency}`;
    if (priceCache[cacheKey]) {
      return priceCache[cacheKey];
    }
    
    // Try sync from context cache
    const syncResult = formatPriceSync(amount, sourceCurrency);
    
    // If sync result is not in EUR format, use it (already converted)
    if (!syncResult.endsWith('€') || currency === 'EUR') {
      return syncResult;
    }
    
    // If still in EUR format and currency is not EUR, trigger async conversion
    formatPriceAsync(amount, sourceCurrency).then(formatted => {
      if (formatted && formatted !== syncResult) {
        setPriceCache(prev => ({ ...prev, [cacheKey]: formatted }));
        setForceUpdate(prev => prev + 1);
      }
    });
    
    return syncResult; // Return EUR format temporarily while converting
  };

  useEffect(() => {
    fetchServices();
    fetchOptions();
  }, []);

  // Preload conversions when currency changes
  useEffect(() => {
    console.log('💰 [PriceDetails] Currency changed to:', currency);
    // Clear local cache when currency changes
    setPriceCache({});
    
    // Preload all prices that will be displayed
    const preloadPrices = async () => {
      const pricesToConvert = new Set();
      
      // Collect all prices from services
      if (formData.selectedServices) {
        formData.selectedServices.forEach(serviceId => {
          const service = servicesMap[serviceId];
          const documents = formData.serviceDocuments?.[serviceId] || [];
          if (service) {
            const servicePrice = getServicePrice(service, currency);
            const serviceTotal = documents.length * servicePrice;
            pricesToConvert.add(serviceTotal);
            
            // Collect option prices
            documents.forEach(doc => {
              if (doc.selectedOptions && doc.selectedOptions.length > 0) {
                doc.selectedOptions.forEach(optionId => {
                  const option = optionsMap[optionId];
                  if (option) {
                    const optionPrice = getOptionPrice(option, currency);
                    pricesToConvert.add(optionPrice);
                  }
                });
              }
            });
          }
        });
      }
      
      // Add signatory price - Temporarily disabled
      // if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1) {
      //   pricesToConvert.add((formData.signatories.length - 1) * 45);
      // }
      
      // Convert all prices
      const conversions = await Promise.all(
        Array.from(pricesToConvert).map(async (price) => {
          try {
            const formatted = await formatPriceAsync(price);
            return { price, formatted };
          } catch (error) {
            console.warn('Error converting price:', price, error);
            return { price, formatted: `${price}€` };
          }
        })
      );
      
      // Update cache
      const newCache = {};
      conversions.forEach(({ price, formatted }) => {
        const cacheKey = `${price}_${currency}`;
        newCache[cacheKey] = formatted;
      });
      
      setPriceCache(newCache);
      setForceUpdate(prev => prev + 1);
    };
    
    // Only preload if services are loaded and we have form data
    if (!loading && formData.selectedServices && formData.selectedServices.length > 0) {
      preloadPrices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, loading, formData.selectedServices, formData.serviceDocuments, formData.signatories]);

  // Calculate total amount
  const calculateTotal = () => {
    let total = 0;
    if (formData.selectedServices) {
      formData.selectedServices.forEach(serviceId => {
        const service = servicesMap[serviceId];
        const documents = formData.serviceDocuments?.[serviceId] || [];
        if (service) {
          const servicePrice = getServicePrice(service, currency);
          const servicePriceCurrency = getServicePriceCurrency(service, currency);
          
          // Convert price to target currency if needed
          const servicePriceInCurrency = servicePriceCurrency === currency
            ? servicePrice
            : convertPriceSync(servicePrice, currency);
          
          total += documents.length * servicePriceInCurrency;
          documents.forEach(doc => {
            if (doc.selectedOptions && doc.selectedOptions.length > 0) {
              doc.selectedOptions.forEach(optionId => {
                const option = optionsMap[optionId];
                if (option) {
                  const optionPrice = getOptionPrice(option, currency);
                  const optionPriceCurrency = getOptionPriceCurrency(option, currency);
                  
                  // Convert price to target currency if needed
                  const optionPriceInCurrency = optionPriceCurrency === currency
                    ? optionPrice
                    : convertPriceSync(optionPrice, currency);
                  
                  total += optionPriceInCurrency;
                }
              });
            }
          });
        }
      });
    }
    
    // Add delivery cost if postal delivery selected
    const DELIVERY_POSTAL_PRICE_EUR = 29.95;
    if (formData.deliveryMethod === 'postal') {
      const deliveryPrice = currency === 'EUR' 
        ? DELIVERY_POSTAL_PRICE_EUR 
        : convertPriceSync(DELIVERY_POSTAL_PRICE_EUR, currency);
      total += deliveryPrice;
    }
    
    // Signatories pricing - Temporarily disabled
    // if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1) {
    //   total += (formData.signatories.length - 1) * 45;
    // }
    return total;
  };


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
    <div className="shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="px-2 sm:px-3 pt-2.5 sm:pt-3 pb-2.5 sm:pb-3">
        <button
          type="button"
          onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
          className="w-full flex items-center justify-between text-left hover:bg-gray-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Icon icon="heroicons:currency-dollar" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="text-xs sm:text-sm font-semibold text-gray-900">{t('form.priceDetails.title')}</span>
          </div>
          <Icon 
            icon={isPriceDetailsOpen ? "heroicons:chevron-up" : "heroicons:chevron-down"} 
            className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 font-bold transition-transform"
          />
        </button>
        
        {isPriceDetailsOpen && (
          <div className="mt-2 sm:mt-3 bg-white rounded-xl p-2 sm:p-3 border border-gray-200 max-h-[40vh] overflow-y-auto min-h-[100px]">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <div key={`prices-${currency}-${forceUpdate}`} className="space-y-1.5 sm:space-y-2">
                {/* Services with file count pricing */}
                {formData.selectedServices && formData.selectedServices.length > 0 ? (
                  <>
                    {formData.selectedServices.map((serviceId, index) => {
                      const service = servicesMap[serviceId];
                      if (!service) return null;

                      const documents = formData.serviceDocuments?.[serviceId] || [];
                      const servicePrice = getServicePrice(service, currency);
                      const servicePriceCurrency = getServicePriceCurrency(service, currency);
                      const servicePriceInCurrency = servicePriceCurrency === currency
                        ? servicePrice
                        : convertPriceSync(servicePrice, currency);
                      const serviceTotal = documents.length * servicePriceInCurrency;

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
                              {getServiceName(service)} ({documents.length} {documents.length > 1 ? t('form.priceDetails.documentPlural') : t('form.priceDetails.document')})
                            </span>
                            <span className="text-[10px] sm:text-xs font-semibold text-gray-900 flex-shrink-0">
                              {formatPrice(serviceTotal, currency)}
                            </span>
                          </div>
                          {/* Show options breakdown */}
                          {Object.keys(optionCounts).length > 0 && (
                            <div className="ml-2 sm:ml-3 mt-1 sm:mt-1.5 space-y-0.5">
                              {Object.entries(optionCounts).map(([optionId, count]) => {
                                const option = optionsMap[optionId];
                                if (!option) return null;
                                const optionPrice = getOptionPrice(option, currency);
                                const optionPriceCurrency = getOptionPriceCurrency(option, currency);
                                const optionPriceInCurrency = optionPriceCurrency === currency
                                  ? optionPrice
                                  : convertPriceSync(optionPrice, currency);
                                const optionTotal = count * optionPriceInCurrency;
                                return (
                                  <div key={optionId} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5">
                                    <span className="text-[9px] sm:text-[10px] text-gray-500 italic break-words">
                                      + {option.name} ({count} {count > 1 ? t('form.priceDetails.documentPlural') : t('form.priceDetails.document')})
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-700 flex-shrink-0">
                                      {formatPrice(optionTotal, currency)}
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
                    <p className="text-xs sm:text-sm text-gray-500">
                      {t('form.priceDetails.noServices')}
                    </p>
                  </div>
                )}

                {/* Show signatories breakdown - global for all services - Temporarily hidden
                {formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1 && (
                  <div className="pt-1.5 sm:pt-2 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5">
                      <span className="text-[9px] sm:text-[10px] text-gray-500 italic break-words">
                        + {t('form.priceDetails.additionalSignatories')} ({formData.signatories.length - 1} {(formData.signatories.length - 1) > 1 ? t('form.priceDetails.signatoryPlural') : t('form.priceDetails.signatory')})
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-semibold text-gray-700 flex-shrink-0">
                        {formatPrice((formData.signatories.length - 1) * 45)}
                      </span>
                    </div>
                  </div>
                )}
                */}

                {/* Total - Always show even if 0 */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-1.5 sm:pt-2 border-t-2 border-gray-300 gap-0.5 sm:gap-1">
                  <span className="text-xs sm:text-sm font-bold text-gray-900 flex-shrink-0">{t('form.priceDetails.total')}</span>
                  <span className="text-sm sm:text-base font-bold text-gray-900 flex-shrink-0">
                    {formatPrice(calculateTotal(), currency)}
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



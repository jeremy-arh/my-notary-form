/**
 * Pricing utilities
 * Calculate total prices for services, options, delivery, and signatories
 */

import { convertPriceSync } from './currency';

const DELIVERY_POSTAL_PRICE_EUR = 20;
const ADDITIONAL_SIGNATORY_PRICE_EUR = 45;

/**
 * Get the service price based on currency
 * For USD and GBP, use direct price columns if available
 * For other currencies, use base_price (will be converted dynamically)
 * @param {object} service - The service object
 * @param {string} currency - The target currency (USD, GBP, EUR, etc.)
 * @returns {number} - The price in the target currency (or EUR base_price for conversion)
 */
export const getServicePrice = (service, currency) => {
  if (!service) return 0;
  
  // For USD, use price_usd if available, otherwise fallback to base_price
  if (currency === 'USD' && service.price_usd != null) {
    return service.price_usd;
  }
  
  // For GBP, use price_gbp if available, otherwise fallback to base_price
  if (currency === 'GBP' && service.price_gbp != null) {
    return service.price_gbp;
  }
  
  // For all other currencies, use base_price (will be converted dynamically)
  return service.base_price || 0;
};

/**
 * Get the currency of the price returned by getServicePrice
 * @param {object} service - The service object
 * @param {string} targetCurrency - The target currency (USD, GBP, EUR, etc.)
 * @returns {string} - The currency of the price (USD, GBP, or EUR)
 */
export const getServicePriceCurrency = (service, targetCurrency) => {
  if (!service) return 'EUR';
  
  // If we're using price_usd, the price is in USD
  if (targetCurrency === 'USD' && service.price_usd != null) {
    return 'USD';
  }
  
  // If we're using price_gbp, the price is in GBP
  if (targetCurrency === 'GBP' && service.price_gbp != null) {
    return 'GBP';
  }
  
  // Otherwise, the price is in EUR (base_price)
  return 'EUR';
};

/**
 * Get the option price based on currency
 * For USD and GBP, use direct price columns if available
 * For other currencies, use additional_price (will be converted dynamically)
 * @param {object} option - The option object
 * @param {string} currency - The target currency (USD, GBP, EUR, etc.)
 * @returns {number} - The price in the target currency (or EUR additional_price for conversion)
 */
export const getOptionPrice = (option, currency) => {
  if (!option) return 0;
  
  // For USD, use price_usd if available, otherwise fallback to additional_price
  if (currency === 'USD' && option.price_usd != null) {
    return option.price_usd;
  }
  
  // For GBP, use price_gbp if available, otherwise fallback to additional_price
  if (currency === 'GBP' && option.price_gbp != null) {
    return option.price_gbp;
  }
  
  // For all other currencies, use additional_price (will be converted dynamically)
  return option.additional_price || 0;
};

/**
 * Get the currency of the price returned by getOptionPrice
 * @param {object} option - The option object
 * @param {string} targetCurrency - The target currency (USD, GBP, EUR, etc.)
 * @returns {string} - The currency of the price (USD, GBP, or EUR)
 */
export const getOptionPriceCurrency = (option, targetCurrency) => {
  if (!option) return 'EUR';
  
  // If we're using price_usd, the price is in USD
  if (targetCurrency === 'USD' && option.price_usd != null) {
    return 'USD';
  }
  
  // If we're using price_gbp, the price is in GBP
  if (targetCurrency === 'GBP' && option.price_gbp != null) {
    return 'GBP';
  }
  
  // Otherwise, the price is in EUR (additional_price)
  return 'EUR';
};

/**
 * Calculate the total amount for the form
 * @param {object} formData - The form data
 * @param {object} servicesMap - Map of service IDs to service objects
 * @param {object} optionsMap - Map of option IDs to option objects
 * @param {string} currency - The target currency (default: EUR)
 * @returns {number} - Total amount in the target currency (or EUR base_price for conversion)
 */
export const calculateTotalAmount = (formData, servicesMap = {}, optionsMap = {}, currency = 'EUR') => {
  let total = 0;

  // Calculate services and options total
  if (formData.selectedServices && formData.selectedServices.length > 0) {
    formData.selectedServices.forEach(serviceId => {
      const service = servicesMap[serviceId];
      const documents = formData.serviceDocuments?.[serviceId] || [];
      
      if (service) {
        // Use getServicePrice to get the correct price based on currency
        const servicePrice = getServicePrice(service, currency);
        const servicePriceCurrency = getServicePriceCurrency(service, currency);
        
        // Convert price to target currency if needed
        const servicePriceInCurrency = servicePriceCurrency === currency
          ? servicePrice
          : convertPriceSync(servicePrice, currency);
        
        total += documents.length * servicePriceInCurrency;
        
        // Additional options
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
  if (formData.deliveryMethod === 'postal') {
    // Convert delivery price to target currency
    const deliveryPrice = currency === 'EUR' 
      ? DELIVERY_POSTAL_PRICE_EUR 
      : convertPriceSync(DELIVERY_POSTAL_PRICE_EUR, currency);
    total += deliveryPrice;
  }

  // Add cost for additional signatories (first one is free) - Temporarily disabled
  // if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1) {
  //   const additionalSignatories = formData.signatories.length - 1;
  //   total += additionalSignatories * ADDITIONAL_SIGNATORY_PRICE_EUR;
  // }

  return total;
};

/**
 * Calculate total with services and options objects
 * @param {object} formData - The form data
 * @param {Array} services - Array of service objects
 * @param {Array} options - Array of option objects
 * @returns {number} - Total amount in EUR
 */
export const calculateTotalFromArrays = (formData, services = [], options = []) => {
  // Convert arrays to maps
  const servicesMap = {};
  services.forEach(service => {
    servicesMap[service.service_id] = service;
  });

  const optionsMap = {};
  options.forEach(option => {
    optionsMap[option.option_id] = option;
  });

  return calculateTotalAmount(formData, servicesMap, optionsMap);
};






/**
 * Pricing utilities
 * Calculate total prices for services, options, delivery, and signatories
 */

const DELIVERY_POSTAL_PRICE_EUR = 20;
const ADDITIONAL_SIGNATORY_PRICE_EUR = 10;

/**
 * Calculate the total amount for the form
 * @param {object} formData - The form data
 * @param {object} servicesMap - Map of service IDs to service objects
 * @param {object} optionsMap - Map of option IDs to option objects
 * @returns {number} - Total amount in EUR
 */
export const calculateTotalAmount = (formData, servicesMap = {}, optionsMap = {}) => {
  let total = 0;

  // Calculate services and options total
  if (formData.selectedServices && formData.selectedServices.length > 0) {
    formData.selectedServices.forEach(serviceId => {
      const service = servicesMap[serviceId];
      const documents = formData.serviceDocuments?.[serviceId] || [];
      
      if (service) {
        // Base price per document
        total += documents.length * (service.base_price || 0);
        
        // Additional options
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

  // Add delivery cost if postal delivery selected
  if (formData.deliveryMethod === 'postal') {
    total += DELIVERY_POSTAL_PRICE_EUR;
  }

  // Add cost for additional signatories (first one is free)
  if (formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 1) {
    const additionalSignatories = formData.signatories.length - 1;
    total += additionalSignatories * ADDITIONAL_SIGNATORY_PRICE_EUR;
  }

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


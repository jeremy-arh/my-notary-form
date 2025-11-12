/**
 * Google Tag Manager Utility for Client Dashboard
 * Helper functions to send events to GTM dataLayer
 */

/**
 * Initialize GTM dataLayer if it doesn't exist
 */
export const initGTM = () => {
  if (typeof window !== 'undefined' && !window.dataLayer) {
    window.dataLayer = [];
  }
};

/**
 * Push an event to GTM dataLayer
 * @param {string} eventName - Name of the event
 * @param {object} eventData - Additional event data
 */
export const pushGTMEvent = (eventName, eventData = {}) => {
  if (typeof window === 'undefined' || !window.dataLayer) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('GTM dataLayer not initialized');
    }
    return;
  }

  const eventPayload = {
    event: eventName,
    event_name: eventName, // Pour GTM server-side
    ...eventData
  };

  // Push to dataLayer
  window.dataLayer.push(eventPayload);

  // Debug log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 [GTM] Event pushed to dataLayer:', eventPayload);
  }
};

/**
 * Track payment success (purchase event for Google Ads conversion)
 * Structured according to GTM Enhanced Conversions requirements
 * @param {object} paymentData - Payment data
 */
export const trackPaymentSuccess = (paymentData) => {
  // Structure the event according to GTM Enhanced Conversions format
  // Note: pushGTMEvent will add 'event' and 'event_name' automatically
  const eventData = {
    transaction_id: paymentData.submissionId, // Use submission_id as transaction_id
    value: paymentData.amount || 0,
    currency: paymentData.currency || 'EUR',
    // User data for Enhanced Conversions
    user_data: {
      email: paymentData.userData?.email || '',
      phone_number: paymentData.userData?.phone || '',
      address: {
        first_name: paymentData.userData?.firstName || '',
        last_name: paymentData.userData?.lastName || '',
        postal_code: paymentData.userData?.postalCode || '',
        country: paymentData.userData?.country || '',
      },
    },
    // Items array with selected services
    items: (paymentData.selectedServices || []).map((service) => ({
      item_id: service.service_id || service.id || '',
      item_name: service.name || service.service_name || '',
      price: service.price || 0,
      quantity: 1,
    })),
    // Customer status
    new_customer: paymentData.isFirstPurchase !== undefined ? paymentData.isFirstPurchase : true,
    services_count: paymentData.servicesCount || (paymentData.selectedServices || []).length,
  };

  // Push to dataLayer (pushGTMEvent will add 'event' and 'event_name')
  pushGTMEvent('purchase', eventData);
};

/**
 * Track payment failure
 * @param {object} errorData - Error data
 */
export const trackPaymentFailure = (errorData) => {
  pushGTMEvent('payment_failure', {
    error_message: errorData.message,
    submission_id: errorData.submissionId
  });
};

// Initialize GTM on module load
if (typeof window !== 'undefined') {
  initGTM();
}


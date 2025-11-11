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
    console.warn('GTM dataLayer not initialized');
    return;
  }

  window.dataLayer.push({
    event: eventName,
    event_name: eventName, // Pour GTM server-side
    ...eventData
  });
};

/**
 * Track payment success (purchase event for Google Ads conversion)
 * @param {object} paymentData - Payment data
 */
export const trackPaymentSuccess = (paymentData) => {
  // Envoyer l'événement purchase avec les variables attendues par GTM
  pushGTMEvent('purchase', {
    transaction_id: paymentData.transactionId,
    value: paymentData.amount, // Montant en nombre (pas de formatage)
    currency: paymentData.currency || 'EUR',
    // Données supplémentaires pour tracking
    submission_id: paymentData.submissionId,
    services_count: paymentData.servicesCount || 0
  });
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


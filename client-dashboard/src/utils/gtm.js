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
 * Track page view
 * @param {string} pageName - Page name
 * @param {string} pagePath - Page path
 */
export const trackPageView = (pageName, pagePath) => {
  const pageLocation = typeof window !== 'undefined' ? window.location.href : pagePath;
  const pageReferrer = typeof document !== 'undefined' ? document.referrer || '' : '';
  const screenResolution = typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : null;

  pushGTMEvent('page_view', {
    page_title: typeof document !== 'undefined' ? document.title : '',
    page_location: pageLocation,
    page_path: typeof window !== 'undefined' ? window.location.pathname : pagePath,
    page_name: pageName,
    page_referrer: pageReferrer,
    screen_resolution: screenResolution
  });
};

/**
 * Track form start (when user clicks CTA to begin form)
 * @param {object} options - Form start options
 */
export const trackFormStart = (options = {}) => {
  pushGTMEvent('form_start', {
    form_name: options.formName || 'notarization_form',
    service_type: options.serviceType || 'Document Notarization',
    cta_location: options.ctaLocation || 'homepage_hero',
    cta_text: options.ctaText || 'Commencer ma notarisation'
  });
};

/**
 * Track form step completion
 * @param {number} stepNumber - Step number
 * @param {string} stepName - Step name
 */
export const trackFormStep = (stepNumber, stepName) => {
  pushGTMEvent('form_step_completed', {
    step_number: stepNumber,
    step_name: stepName
  });
};

/**
 * Track begin checkout (when user clicks "Confirm & Pay" button)
 * @param {object} checkoutData - Checkout data
 */
export const trackBeginCheckout = (checkoutData) => {
  const items = (checkoutData.items || []).map((item) => ({
    item_id: item.item_id || item.service_id || item.id || '',
    item_name: item.item_name || item.name || item.service_name || '',
    item_category: item.item_category || 'Notarization Service',
    price: item.price || 0,
    quantity: item.quantity || 1
  }));

  pushGTMEvent('begin_checkout', {
    currency: checkoutData.currency || 'EUR',
    value: checkoutData.value || checkoutData.amount || 0,
    items: items
  });
};

/**
 * Track form submission start
 * @param {object} formData - Form data
 */
export const trackFormSubmissionStart = (formData) => {
  pushGTMEvent('form_submission_start', {
    form_type: 'notary_service',
    options_count: formData.selectedOptions?.length || 0,
    documents_count: Array.isArray(formData.documents) ? formData.documents.length : 0
  });
};

/**
 * Track form submission success
 * @param {object} submissionData - Submission data
 */
export const trackFormSubmission = (submissionData) => {
  pushGTMEvent('form_submit', {
    form_type: 'notary_service',
    submission_id: submissionData.submissionId,
    options_count: submissionData.optionsCount || 0,
    documents_count: submissionData.documentsCount || 0
  });
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


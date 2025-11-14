/**
 * Google Tag Manager Utility for Notary Form
 * Helper functions to send events to GTM dataLayer
 * Compatible with GTM Web (client-side) and GTM Server-Side
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
 * Compatible with both client-side and server-side GTM
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
    event_name: eventName, // For GTM server-side compatibility
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
 * This event is used by GTM to trigger Google Ads conversion tracking
 * @param {object} paymentData - Payment data
 */
export const trackPaymentSuccess = (paymentData) => {
  // Envoyer l'événement purchase avec les variables attendues par GTM
  // Variables: value, currency, transaction_id
  pushGTMEvent('purchase', {
    transaction_id: paymentData.transactionId,
    value: typeof paymentData.amount === 'number' ? paymentData.amount : parseFloat(paymentData.amount) || 0,
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
  pushGTMEvent('payment_failed', {
    error_message: errorData.message,
    submission_id: errorData.submissionId
  });
};

/**
 * Track service selection
 * @param {string} serviceId - Service ID
 * @param {string} serviceName - Service name
 * @param {number} servicePrice - Service price
 */
export const trackServiceSelection = (serviceId, serviceName, servicePrice) => {
  pushGTMEvent('service_selected', {
    service_id: serviceId,
    service_name: serviceName,
    service_price: servicePrice,
    currency: 'EUR'
  });
};

/**
 * Track document upload
 * @param {string} serviceId - Service ID
 * @param {number} documentCount - Number of documents uploaded
 */
export const trackDocumentUpload = (serviceId, documentCount) => {
  pushGTMEvent('document_uploaded', {
    service_id: serviceId,
    document_count: documentCount
  });
};

/**
 * Track appointment booking
 * @param {string} appointmentDate - Appointment date
 * @param {string} appointmentTime - Appointment time
 * @param {string} timezone - Timezone
 */
export const trackAppointmentBooking = (appointmentDate, appointmentTime, timezone) => {
  pushGTMEvent('appointment_booked', {
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    timezone: timezone
  });
};

// Initialize GTM on module load
if (typeof window !== 'undefined') {
  initGTM();
}

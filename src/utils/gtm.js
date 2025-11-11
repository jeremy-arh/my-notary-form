/**
 * Google Tag Manager Utility
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
 * Track payment success
 * @param {object} paymentData - Payment data
 */
export const trackPaymentSuccess = (paymentData) => {
  pushGTMEvent('payment_success', {
    transaction_id: paymentData.transactionId,
    value: paymentData.amount,
    currency: paymentData.currency || 'EUR',
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
 * Track page view
 * @param {string} pageName - Page name
 * @param {string} pagePath - Page path
 */
export const trackPageView = (pageName, pagePath) => {
  // Récupérer l'URL complète pour page_location
  const pageLocation = typeof window !== 'undefined' ? window.location.href : pagePath;
  const pageReferrer = typeof document !== 'undefined' ? document.referrer || '' : '';
  const screenResolution = typeof window !== 'undefined' && window.screen ? window.screen.width : null;

  pushGTMEvent('page_view', {
    page_name: pageName,
    page_path: pagePath,
    page_title: typeof document !== 'undefined' ? document.title : '',
    // Clés attendues par GTM server-side
    page_location: pageLocation,
    page_referrer: pageReferrer,
    screen_resolution: screenResolution
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


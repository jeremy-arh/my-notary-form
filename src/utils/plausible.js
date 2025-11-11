/**
 * Plausible Analytics - Direct API Integration
 * Compatible with Cloudflare Pages/Workers
 * Documentation: https://plausible.io/docs/events-api
 */

const PLAUSIBLE_DOMAIN = 'mynotary.io';
const PLAUSIBLE_API = 'https://plausible.io/api/event';

/**
 * Send event to Plausible API
 * @param {object} eventData - Event data
 */
const sendToPlausible = async (eventData) => {
  if (typeof window === 'undefined') return;
  
  try {
    await fetch(PLAUSIBLE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: PLAUSIBLE_DOMAIN,
        ...eventData
      })
    });
  } catch (error) {
    // Silently fail - don't break the app if analytics fails
    if (process.env.NODE_ENV === 'development') {
      console.warn('Plausible tracking error:', error);
    }
  }
};

/**
 * Track page view
 * @param {string} pageName - Page name
 * @param {string} pagePath - Page path
 */
export const trackPageView = (pageName, pagePath) => {
  // The script in index.html handles automatic page views
  // This is for custom page views with props
  sendToPlausible({
    name: 'pageview',
    url: pagePath || window.location.href,
    props: {
      page_name: pageName
    }
  });
};

/**
 * Track custom event
 * @param {string} eventName - Event name
 * @param {object} props - Event properties (optional)
 */
export const trackEvent = (eventName, props = {}) => {
  sendToPlausible({
    name: eventName,
    url: window.location.href,
    props: props
  });
};

/**
 * Track form step completion
 * @param {number} stepNumber - Step number
 * @param {string} stepName - Step name
 */
export const trackFormStep = (stepNumber, stepName) => {
  trackEvent('form_step_completed', {
    step_number: stepNumber,
    step_name: stepName
  });
};

/**
 * Track form submission start
 * @param {object} formData - Form data
 */
export const trackFormSubmissionStart = (formData) => {
  trackEvent('form_submission_start', {
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
  trackEvent('payment_success', {
    transaction_id: paymentData.transactionId,
    value: paymentData.amount,
    currency: paymentData.currency || 'EUR',
    submission_id: paymentData.submissionId
  });
};

/**
 * Track payment failure
 * @param {object} errorData - Error data
 */
export const trackPaymentFailure = (errorData) => {
  trackEvent('payment_failure', {
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
  trackEvent('service_selected', {
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
  trackEvent('document_uploaded', {
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
  trackEvent('appointment_booked', {
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    timezone: timezone
  });
};

// No default export needed


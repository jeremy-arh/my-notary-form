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

  // Log event before pushing (always visible)
  console.log('%c📊 [GTM] Event:', 'color: #4285f4; font-weight: bold', eventName);
  console.log('%c   Data:', 'color: #34a853; font-weight: bold', eventPayload);

  // Push to dataLayer
  window.dataLayer.push(eventPayload);
  
  console.log('%c   ✅ Pushed to dataLayer', 'color: #0f9d58; font-style: italic');
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
 * Track service selection
 * @param {number} servicesCount - Number of services selected
 * @param {array} serviceIds - Array of selected service IDs
 */
export const trackServiceSelected = (servicesCount, serviceIds = []) => {
  pushGTMEvent('service_selected', {
    services_count: servicesCount,
    service_ids: serviceIds.join(',')
  });
};

/**
 * Track document upload
 * @param {number} documentsCount - Total number of documents uploaded
 * @param {number} servicesWithDocs - Number of services with documents
 */
export const trackDocumentUploaded = (documentsCount, servicesWithDocs) => {
  pushGTMEvent('document_uploaded', {
    documents_count: documentsCount,
    services_with_docs: servicesWithDocs
  });
};

/**
 * Track appointment booking
 * @param {object} appointmentData - Appointment data
 */
export const trackAppointmentBooked = (appointmentData) => {
  pushGTMEvent('appointment_booked', {
    appointment_date: appointmentData.date,
    appointment_time: appointmentData.time,
    timezone: appointmentData.timezone
  });
};

/**
 * Track signatories added
 * @param {number} signatoriesCount - Number of signatories
 */
export const trackSignatoriesAdded = (signatoriesCount) => {
  pushGTMEvent('signatories_added', {
    signatories_count: signatoriesCount
  });
};

/**
 * Track personal info completed
 * @param {boolean} isAuthenticated - Whether user is authenticated
 */
export const trackPersonalInfoCompleted = (isAuthenticated) => {
  pushGTMEvent('personal_info_completed', {
    is_authenticated: isAuthenticated
  });
};

/**
 * Track summary viewed
 * @param {object} summaryData - Summary data
 */
export const trackSummaryViewed = (summaryData) => {
  pushGTMEvent('summary_viewed', {
    total_services: summaryData.totalServices || 0,
    total_documents: summaryData.totalDocuments || 0,
    total_signatories: summaryData.totalSignatories || 0,
    has_appointment: summaryData.hasAppointment || false
  });
};

/**
 * Track payment initiated
 * @param {object} paymentData - Payment data
 */
export const trackPaymentInitiated = (paymentData) => {
  pushGTMEvent('payment_initiated', {
    total_amount: paymentData.amount || 0,
    currency: paymentData.currency || 'EUR',
    services_count: paymentData.servicesCount || 0
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


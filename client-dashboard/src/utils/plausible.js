/**
 * Plausible Analytics - Funnel Tracking
 * Tracks form conversion funnel for Plausible Analytics
 * Documentation: https://plausible.io/docs/custom-event-goals
 */

/**
 * Track custom event using the global plausible() function
 * @param {string} eventName - Event name
 * @param {object} props - Event properties (optional)
 */
export const trackEvent = (eventName, props = {}) => {
  if (typeof window === 'undefined' || !window.plausible) {
    console.warn('⚠️ [Plausible] plausible() function not available');
    return;
  }
  
  try {
    // Log event before sending (always visible)
    console.log('%c🎯 [Plausible] Event:', 'color: #5850ec; font-weight: bold', eventName);
    if (Object.keys(props).length > 0) {
      console.log('%c   Props:', 'color: #8b5cf6; font-weight: bold', props);
    }
    
    // Use the global plausible() function to send custom events
    if (Object.keys(props).length > 0) {
      window.plausible(eventName, { props });
    } else {
      window.plausible(eventName);
    }
    
    console.log('%c   ✅ Sent to Plausible', 'color: #7c3aed; font-style: italic');
  } catch (error) {
    console.error('❌ [Plausible] Tracking error:', error);
  }
};

/**
 * FUNNEL TRACKING - Form Conversion Funnel
 * These events are designed to be used in Plausible Funnels
 */

/**
 * Step 1: Form Started - User lands on the form
 */
export const trackFormStart = () => {
  trackEvent('form_started', {
    funnel_step: '1_form_started'
  });
};

/**
 * Step 2: Services Selected - User selects at least one service
 * @param {number} servicesCount - Number of services selected
 * @param {Array<string>} serviceIds - Array of service IDs
 */
export const trackServicesSelected = (servicesCount, serviceIds = []) => {
  trackEvent('services_selected', {
    funnel_step: '2_services_selected',
    services_count: servicesCount,
    service_ids: serviceIds.join(',')
  });
};

/**
 * Step 3: Documents Uploaded - User uploads documents for at least one service
 * @param {number} documentsCount - Total number of documents uploaded
 * @param {number} servicesWithDocs - Number of services with documents
 */
export const trackDocumentsUploaded = (documentsCount, servicesWithDocs) => {
  trackEvent('documents_uploaded', {
    funnel_step: '3_documents_uploaded',
    documents_count: documentsCount,
    services_with_docs: servicesWithDocs
  });
};

/**
 * Step 4: Signatories Added - User adds at least one signatory
 * @param {number} signatoriesCount - Number of signatories added
 */
export const trackSignatoriesAdded = (signatoriesCount) => {
  trackEvent('signatories_added', {
    funnel_step: '4_signatories_added',
    signatories_count: signatoriesCount
  });
};

/**
 * Step 5: Appointment Booked - User selects date and time
 * @param {string} appointmentDate - Appointment date
 * @param {string} appointmentTime - Appointment time
 * @param {string} timezone - Timezone
 */
export const trackAppointmentBooked = (appointmentDate, appointmentTime, timezone) => {
  trackEvent('appointment_booked', {
    funnel_step: '5_appointment_booked',
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    timezone: timezone
  });
};

/**
 * Step 6: Personal Info Completed - User fills in personal information
 * @param {boolean} isAuthenticated - Whether user is authenticated
 */
export const trackPersonalInfoCompleted = (isAuthenticated = false) => {
  trackEvent('personal_info_completed', {
    funnel_step: '6_personal_info_completed',
    is_authenticated: isAuthenticated
  });
};

/**
 * Step 7: Summary Viewed - User reaches the summary page
 * @param {object} summaryData - Summary data
 */
export const trackSummaryViewed = (summaryData = {}) => {
  trackEvent('summary_viewed', {
    funnel_step: '7_summary_viewed',
    total_services: summaryData.servicesCount || 0,
    total_documents: summaryData.documentsCount || 0,
    total_signatories: summaryData.signatoriesCount || 0,
    has_appointment: summaryData.hasAppointment || false
  });
};

/**
 * Step 8: Payment Initiated - User clicks submit and payment process starts
 * @param {object} paymentData - Payment data
 */
export const trackPaymentInitiated = (paymentData = {}) => {
  trackEvent('payment_initiated', {
    funnel_step: '8_payment_initiated',
    total_amount: paymentData.totalAmount || 0,
    services_count: paymentData.servicesCount || 0,
    currency: paymentData.currency || 'EUR'
  });
};

/**
 * Step 9: Payment Completed - Payment successful
 * @param {object} paymentData - Payment data
 */
export const trackPaymentCompleted = (paymentData = {}) => {
  trackEvent('payment_completed', {
    funnel_step: '9_payment_completed',
    transaction_id: paymentData.transactionId || '',
    total_amount: paymentData.totalAmount || 0,
    submission_id: paymentData.submissionId || '',
    currency: paymentData.currency || 'EUR'
  });
};

/**
 * Track form abandonment
 * @param {number} currentStep - Current step when user leaves
 * @param {string} stepName - Name of the current step
 */
export const trackFormAbandoned = (currentStep, stepName) => {
  trackEvent('form_abandoned', {
    abandoned_at_step: currentStep,
    step_name: stepName
  });
};

/**
 * Track step navigation
 * @param {number} fromStep - Step user is leaving
 * @param {number} toStep - Step user is going to
 * @param {string} direction - 'next' or 'prev'
 */
export const trackStepNavigation = (fromStep, toStep, direction) => {
  trackEvent('step_navigation', {
    from_step: fromStep,
    to_step: toStep,
    direction: direction
  });
};




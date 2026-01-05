/**
 * Plausible Analytics - Funnel Tracking with Ad Blocker Detection
 * Tracks form conversion funnel for Plausible Analytics
 * Documentation: https://plausible.io/docs/custom-event-goals
 */

// Cache for Plausible availability check
let plausibleAvailable = null;
let plausibleCheckPromise = null;

/**
 * Check if Plausible is available and not blocked by ad blockers
 * @returns {Promise<boolean>} True if Plausible is available
 */
const checkPlausibleAvailability = async () => {
  // Return cached result if available
  if (plausibleAvailable !== null) {
    console.log(`🔍 [Plausible] Using cached availability: ${plausibleAvailable}`);
    return plausibleAvailable;
  }

  // Return existing promise if check is in progress
  if (plausibleCheckPromise) {
    console.log(`🔍 [Plausible] Check already in progress`);
    return plausibleCheckPromise;
  }

  // Start new check
  plausibleCheckPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      console.warn('⚠️ [Plausible] window is undefined');
      resolve(false);
      return;
    }

    console.log('🔍 [Plausible] Starting availability check...');
    console.log('🔍 [Plausible] window.plausible:', typeof window.plausible);
    console.log('🔍 [Plausible] window.plausible value:', window.plausible);

    // Check 1: Is the script loaded?
    if (!window.plausible) {
      console.error('❌ [Plausible] Script not loaded - window.plausible is undefined');
      console.error('❌ [Plausible] This usually means:');
      console.error('   1. Plausible script not loaded in index.html');
      console.error('   2. Script blocked by ad blocker');
      console.error('   3. Script failed to load');
      plausibleAvailable = false;
      resolve(false);
      return;
    }

    // Check 2: Try to detect if the script was blocked
    // Look for the Plausible script tag
    const scripts = Array.from(document.getElementsByTagName('script'));
    const plausibleScript = scripts.find(
      script => script.src && script.src.includes('plausible.io')
    );

    console.log('🔍 [Plausible] Script tag found:', !!plausibleScript);
    if (plausibleScript) {
      console.log('🔍 [Plausible] Script src:', plausibleScript.src);
    }

    if (!plausibleScript) {
      console.warn('⚠️ [Plausible] Script tag not found - may be blocked');
      plausibleAvailable = false;
      resolve(false);
      return;
    }

    // Check 3: Try to call plausible function
    try {
      // Try to call plausible function
      if (typeof window.plausible === 'function') {
        console.log('✅ [Plausible] Function is available and callable');
        // Mark as available for now
        plausibleAvailable = true;
        resolve(true);
      } else {
        console.error('❌ [Plausible] window.plausible exists but is not a function');
        console.error('❌ [Plausible] Type:', typeof window.plausible);
        console.error('❌ [Plausible] Value:', window.plausible);
        plausibleAvailable = false;
        resolve(false);
      }
    } catch (error) {
      console.error('❌ [Plausible] Error checking availability:', error);
      plausibleAvailable = false;
      resolve(false);
    }
  });

  return plausibleCheckPromise;
};

/**
 * Track custom event using Plausible with automatic fallback to Supabase
 * @param {string} eventName - Event name
 * @param {object} props - Event properties (optional)
 */
export const trackEvent = async (eventName, props = {}) => {
  if (typeof window === 'undefined') {
    console.warn('⚠️ [Plausible] window is undefined');
    return;
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 [Plausible] Tracking event: ${eventName}`);
  console.log(`🔍 [Plausible] Props:`, props);
  console.log(`🔍 [Plausible] window.plausible exists:`, typeof window.plausible !== 'undefined');
  console.log(`🔍 [Plausible] window.plausible type:`, typeof window.plausible);
  console.log(`🔍 [Plausible] window.plausible value:`, window.plausible);
  console.log(`🔍 [Plausible] Queue length:`, window.plausible?.q?.length || 0);

  // Check if Plausible is available
  const isPlausibleAvailable = await checkPlausibleAvailability();
  console.log(`🔍 [Plausible] isPlausibleAvailable:`, isPlausibleAvailable);

  // Try Plausible - always try to send even if check failed
  if (window.plausible) {
    try {
      console.log(`🚀 [Plausible] Sending event to Plausible: ${eventName}`, props);
      
      // Use the global plausible() function to send custom events
      // Format: plausible('EventName', { props: { key: value } })
      if (Object.keys(props).length > 0) {
        window.plausible(eventName, { props });
        console.log(`✅ [Plausible] Event sent with props: ${eventName}`, props);
      } else {
        window.plausible(eventName);
        console.log(`✅ [Plausible] Event sent without props: ${eventName}`);
      }
      
      // Log queue after sending
      console.log(`🔍 [Plausible] Queue after send:`, window.plausible?.q?.length || 0);
      
      // Wait a bit to ensure event is processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log(`✅ [Plausible] Event tracking completed: ${eventName}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return;
    } catch (error) {
      console.error('❌ [Plausible] Tracking error:', error);
      console.error('❌ [Plausible] Error details:', error.message, error.stack);
      // Fall through to Supabase fallback
    }
  } else {
    console.error(`❌ [Plausible] window.plausible is NOT available!`);
    console.error(`❌ [Plausible] Type: ${typeof window.plausible}`);
    console.error(`❌ [Plausible] This means Plausible script is not loaded`);
  }

  console.log(`⚠️ [Plausible] Event not sent because Plausible is unavailable: ${eventName}`);
  
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
};

/**
 * FUNNEL TRACKING - Form Conversion Funnel
 * These events are designed to be used in Plausible Funnels
 */

/**
 * Step 1: Form Started - User lands on the form
 */
export const trackFormStart = async () => {
  await trackEvent('form_started', {
    funnel_step: '1_form_started'
  });
};

/**
 * Step 2: Services Selected - User selects at least one service
 * @param {number} servicesCount - Number of services selected
 * @param {Array<string>} serviceIds - Array of service IDs
 */
export const trackServicesSelected = async (servicesCount, serviceIds = []) => {
  await trackEvent('services_selected', {
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
export const trackDocumentsUploaded = async (documentsCount, servicesWithDocs) => {
  await trackEvent('documents_uploaded', {
    funnel_step: '3_documents_uploaded',
    documents_count: documentsCount,
    services_with_docs: servicesWithDocs
  });
};

/**
 * Step 3.5: Delivery Method Selected - User selects delivery method
 * @param {string} deliveryMethod - 'email' or 'postal'
 */
export const trackDeliveryMethodSelected = async (deliveryMethod) => {
  await trackEvent('delivery_method_selected', {
    funnel_step: '3.5_delivery_method_selected',
    delivery_method: deliveryMethod
  });
};

/**
 * Step 4: Signatories Added - User adds at least one signatory
 * @param {number} signatoriesCount - Number of signatories added
 */
export const trackSignatoriesAdded = async (signatoriesCount) => {
  await trackEvent('signatories_added', {
    funnel_step: '4_signatories_added',
    signatories_count: signatoriesCount
  });
};

/**
 * Step 5: Personal Info Completed - User fills in personal information
 * @param {boolean} isAuthenticated - Whether user is authenticated
 */
export const trackPersonalInfoCompleted = async (isAuthenticated = false) => {
  await trackEvent('personal_info_completed', {
    funnel_step: '5_personal_info_completed',
    is_authenticated: isAuthenticated
  });
};

/**
 * Step 6: Summary Viewed - User reaches the summary page
 * @param {object} summaryData - Summary data
 */
export const trackSummaryViewed = async (summaryData = {}) => {
  await trackEvent('summary_viewed', {
    funnel_step: '6_summary_viewed',
    total_services: summaryData.servicesCount || 0,
    total_documents: summaryData.documentsCount || 0,
    total_signatories: summaryData.signatoriesCount || 0
  });
};

/**
 * Step 7: Payment Initiated - User clicks submit and payment process starts
 * @param {object} paymentData - Payment data
 */
export const trackPaymentInitiated = async (paymentData = {}) => {
  await trackEvent('payment_initiated', {
    funnel_step: '7_payment_initiated',
    total_amount: paymentData.totalAmount || 0,
    services_count: paymentData.servicesCount || 0,
    currency: paymentData.currency || 'EUR'
  });
};

/**
 * Step 8: Payment Completed - Payment successful
 * @param {object} paymentData - Payment data
 */
export const trackPaymentCompleted = async (paymentData = {}) => {
  await trackEvent('payment_completed', {
    funnel_step: '8_payment_completed',
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
export const trackFormAbandoned = async (currentStep, stepName) => {
  await trackEvent('form_abandoned', {
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
export const trackStepNavigation = async (fromStep, toStep, direction) => {
  await trackEvent('step_navigation', {
    from_step: fromStep,
    to_step: toStep,
    direction: direction
  });
};






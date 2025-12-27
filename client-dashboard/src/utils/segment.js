/**
 * Segment Analytics - Même événements que Plausible mais avec noms GA4 standards
 * Les événements standards GA4 sont mappés correctement, les custom events restent tels quels
 */

/**
 * Check if Segment Analytics is loaded
 * @returns {boolean}
 */
const isSegmentLoaded = () => {
  const isLoaded = typeof window !== 'undefined' && 
                   window.analytics && 
                   typeof window.analytics.track === 'function';
  
  if (typeof window !== 'undefined') {
    console.log('[Segment] Vérification du chargement:', {
      windowExists: typeof window !== 'undefined',
      analyticsExists: typeof window.analytics !== 'undefined',
      analyticsTrackIsFunction: window.analytics && typeof window.analytics.track === 'function',
      isLoaded: isLoaded,
      initialized: window.analytics?.initialized || false
    });
  }
  
  return isLoaded;
};

/**
 * Wait for Segment to be ready
 * Attend jusqu'à 5 secondes pour que Segment se charge
 * @returns {Promise} Promise that resolves when Segment is loaded or timeout
 */
const waitForSegment = () => {
  return new Promise((resolve) => {
    // Si déjà chargé et initialisé, résoudre immédiatement
    if (isSegmentLoaded() && window.analytics.initialized) {
      console.log('[Segment] ✅ Déjà chargé et initialisé, résolution immédiate');
      resolve();
      return;
    }
    
    console.log('[Segment] ⏳ Attente du chargement de Segment...');
    
    const maxWait = 5000; // 5 secondes max
    const startTime = Date.now();
    const checkInterval = 100; // Vérifier toutes les 100ms
    
    const checkSegment = setInterval(() => {
      if (isSegmentLoaded() && window.analytics.initialized) {
        console.log('[Segment] ✅ Segment chargé après', Date.now() - startTime, 'ms');
        clearInterval(checkSegment);
        resolve();
      } else if (Date.now() - startTime >= maxWait) {
        console.warn('[Segment] ⚠️ Timeout: Segment non chargé après', maxWait, 'ms');
        clearInterval(checkSegment);
        resolve(); // Résoudre quand même pour ne pas bloquer
      }
    }, checkInterval);
  });
};

/**
 * Track a Segment event (generic)
 * @param {string} eventName - Event name (GA4 standard or custom)
 * @param {object} properties - Event properties
 */
export const trackEvent = async (eventName, properties = {}) => {
  console.log('[Segment] trackEvent appelé', { eventName, properties });
  
  await waitForSegment();
  
  if (!isSegmentLoaded()) {
    console.warn('[Segment] ⚠️ Segment non chargé, événement ignoré:', eventName);
    return;
  }

  const eventProps = {
    ...properties,
    page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
    page_url: typeof window !== 'undefined' ? window.location.href : '/',
    page_title: typeof document !== 'undefined' ? document.title : ''
  };
  
  console.log('[Segment] ✅ Envoi événement:', eventName, eventProps);
  
  try {
    window.analytics.track(eventName, eventProps);
    console.log('[Segment] ✅ Événement envoyé avec succès:', eventName);
  } catch (error) {
    console.error('[Segment] ❌ Erreur lors de l\'envoi de l\'événement:', eventName, error);
  }
};

/**
 * FUNNEL TRACKING - Form Conversion Funnel
 * Mapping des événements Plausible vers les événements GA4 standards
 */

/**
 * Step 1: Form Started - Mapped to GA4 'generate_lead'
 */
export const trackFormStart = async () => {
  // GA4 standard event: generate_lead
  await trackEvent('generate_lead', {
    // GA4 standard parameters
    value: 0,
    currency: 'EUR',
    lead_type: 'form_start',
    
    // Custom parameters
    funnel_step: '1_form_started'
  });
};

/**
 * Step 2: Services Selected - Mapped to GA4 'select_item'
 * @param {number} servicesCount - Number of services selected
 * @param {Array<string>} serviceIds - Array of service IDs
 */
export const trackServicesSelected = async (servicesCount, serviceIds = []) => {
  // GA4 standard event: select_item
  await trackEvent('select_item', {
    // GA4 standard parameters
    item_list_id: 'services',
    item_list_name: 'Services List',
    items: serviceIds.map(serviceId => ({
      item_id: serviceId,
      item_name: serviceId,
      item_category: 'service',
      item_list_id: 'services',
      item_list_name: 'Services List'
    })),
    
    // Custom parameters
    funnel_step: '2_services_selected',
    services_count: servicesCount,
    service_ids: serviceIds.join(',')
  });
};

/**
 * Step 3: Documents Uploaded - Custom event
 * @param {number} documentsCount - Total number of documents uploaded
 * @param {number} servicesWithDocs - Number of services with documents
 */
export const trackDocumentsUploaded = async (documentsCount, servicesWithDocs) => {
  // Custom event (not a GA4 standard event)
  await trackEvent('documents_uploaded', {
    funnel_step: '3_documents_uploaded',
    documents_count: documentsCount,
    services_with_docs: servicesWithDocs
  });
};

/**
 * Step 4: Signatories Added - Custom event
 * @param {number} signatoriesCount - Number of signatories added
 */
export const trackSignatoriesAdded = async (signatoriesCount) => {
  // Custom event (not a GA4 standard event)
  await trackEvent('signatories_added', {
    funnel_step: '4_signatories_added',
    signatories_count: signatoriesCount
  });
};

/**
 * Step 5: Personal Info Completed - Custom event
 * @param {boolean} isAuthenticated - Whether user is authenticated
 */
export const trackPersonalInfoCompleted = async (isAuthenticated = false) => {
  // Custom event (not a GA4 standard event)
  await trackEvent('personal_info_completed', {
    funnel_step: '5_personal_info_completed',
    is_authenticated: isAuthenticated
  });
};

/**
 * Step 6: Summary Viewed - Mapped to GA4 'view_item_list'
 * @param {object} summaryData - Summary data
 */
export const trackSummaryViewed = async (summaryData = {}) => {
  // GA4 standard event: view_item_list
  await trackEvent('view_item_list', {
    // GA4 standard parameters
    item_list_id: 'form_summary',
    item_list_name: 'Form Summary',
    
    // Custom parameters
    funnel_step: '6_summary_viewed',
    total_services: summaryData.servicesCount || 0,
    total_documents: summaryData.documentsCount || 0,
    total_signatories: summaryData.signatoriesCount || 0
  });
};

/**
 * Step 7: Payment Initiated - Mapped to GA4 'begin_checkout'
 * @param {object} paymentData - Payment data
 */
export const trackPaymentInitiated = async (paymentData = {}) => {
  // GA4 standard event: begin_checkout
  await trackEvent('begin_checkout', {
    // GA4 standard parameters
    currency: paymentData.currency || 'EUR',
    value: paymentData.totalAmount || 0,
    items: (paymentData.items || []).map(item => ({
      item_id: item.item_id || item.service_id || '',
      item_name: item.item_name || item.service_name || '',
      item_category: item.item_category || 'service',
      price: item.price || 0,
      quantity: item.quantity || 1
    })),
    
    // Custom parameters
    funnel_step: '7_payment_initiated',
    services_count: paymentData.servicesCount || 0
  });
};

/**
 * Step 8: Payment Completed - Mapped to GA4 'purchase'
 * @param {object} paymentData - Payment data
 */
export const trackPaymentCompleted = async (paymentData = {}) => {
  // GA4 standard event: purchase
  await trackEvent('purchase', {
    // GA4 standard parameters
    transaction_id: paymentData.transactionId || paymentData.submissionId || '',
    value: paymentData.totalAmount || 0,
    currency: paymentData.currency || 'EUR',
    items: (paymentData.items || []).map(item => ({
      item_id: item.item_id || item.service_id || '',
      item_name: item.item_name || item.service_name || '',
      item_category: item.item_category || 'service',
      price: item.price || 0,
      quantity: item.quantity || 1
    })),
    
    // Custom parameters
    funnel_step: '8_payment_completed',
    submission_id: paymentData.submissionId || ''
  });
};

/**
 * Track form abandonment - Custom event
 * @param {number} currentStep - Current step when user leaves
 * @param {string} stepName - Name of the current step
 */
export const trackFormAbandoned = async (currentStep, stepName) => {
  // Custom event (not a GA4 standard event)
  await trackEvent('form_abandoned', {
    abandoned_at_step: currentStep,
    step_name: stepName
  });
};

/**
 * Track step navigation - Custom event
 * @param {number} fromStep - Step user is leaving
 * @param {number} toStep - Step user is going to
 * @param {string} direction - 'next' or 'prev'
 */
export const trackStepNavigation = async (fromStep, toStep, direction) => {
  // Custom event (not a GA4 standard event)
  await trackEvent('step_navigation', {
    from_step: fromStep,
    to_step: toStep,
    direction: direction
  });
};


/**
 * Wrapper Analytics - Envoie les événements à Plausible uniquement
 */

/**
 * Load analytics functions (Plausible only)
 * @returns {Promise<object>} Object with all tracking functions
 */
export const loadAnalytics = async () => {
  const plausible = await import('./plausible').catch(() => ({}));

  return {
    // Generic event tracking
    trackEvent: async (eventName, props) => {
      await plausible.trackEvent?.(eventName, props);
    },

    // Funnel tracking functions
    trackFormStart: async () => {
      await plausible.trackFormStart?.();
    },

    trackServicesSelected: async (servicesCount, serviceIds) => {
      await plausible.trackServicesSelected?.(servicesCount, serviceIds);
    },

    trackDocumentsUploaded: async (documentsCount, servicesWithDocs) => {
      await plausible.trackDocumentsUploaded?.(documentsCount, servicesWithDocs);
    },

    trackDeliveryMethodSelected: async (deliveryMethod) => {
      await plausible.trackDeliveryMethodSelected?.(deliveryMethod);
    },

    trackSignatoriesAdded: async (signatoriesCount) => {
      await plausible.trackSignatoriesAdded?.(signatoriesCount);
    },

    trackPersonalInfoCompleted: async (isAuthenticated) => {
      await plausible.trackPersonalInfoCompleted?.(isAuthenticated);
    },

    trackSummaryViewed: async (summaryData) => {
      await plausible.trackSummaryViewed?.(summaryData);
    },

    trackPaymentInitiated: async (paymentData) => {
      await plausible.trackPaymentInitiated?.(paymentData);
    },

    trackPaymentCompleted: async (paymentData) => {
      await plausible.trackPaymentCompleted?.(paymentData);
    },

    trackFormAbandoned: async (currentStep, stepName) => {
      await plausible.trackFormAbandoned?.(currentStep, stepName);
    }
  };
};

// Export individual functions for direct imports
export const trackEvent = async (eventName, props) => {
  const analytics = await loadAnalytics();
  return analytics.trackEvent(eventName, props);
};

export const trackFormStart = async () => {
  const analytics = await loadAnalytics();
  return analytics.trackFormStart();
};

export const trackServicesSelected = async (servicesCount, serviceIds) => {
  const analytics = await loadAnalytics();
  return analytics.trackServicesSelected(servicesCount, serviceIds);
};

export const trackDocumentsUploaded = async (documentsCount, servicesWithDocs) => {
  const analytics = await loadAnalytics();
  return analytics.trackDocumentsUploaded(documentsCount, servicesWithDocs);
};

export const trackDeliveryMethodSelected = async (deliveryMethod) => {
  const analytics = await loadAnalytics();
  return analytics.trackDeliveryMethodSelected(deliveryMethod);
};

export const trackSignatoriesAdded = async (signatoriesCount) => {
  const analytics = await loadAnalytics();
  return analytics.trackSignatoriesAdded(signatoriesCount);
};

export const trackPersonalInfoCompleted = async (isAuthenticated) => {
  const analytics = await loadAnalytics();
  return analytics.trackPersonalInfoCompleted(isAuthenticated);
};

export const trackSummaryViewed = async (summaryData) => {
  const analytics = await loadAnalytics();
  return analytics.trackSummaryViewed(summaryData);
};

export const trackPaymentInitiated = async (paymentData) => {
  const analytics = await loadAnalytics();
  return analytics.trackPaymentInitiated(paymentData);
};

export const trackPaymentCompleted = async (paymentData) => {
  const analytics = await loadAnalytics();
  return analytics.trackPaymentCompleted(paymentData);
};

export const trackFormAbandoned = async (currentStep, stepName) => {
  const analytics = await loadAnalytics();
  return analytics.trackFormAbandoned(currentStep, stepName);
};







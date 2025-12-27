/**
 * Wrapper Analytics - Envoie les événements à la fois à Plausible et Segment
 * Les événements Segment utilisent les noms GA4 standards
 */

/**
 * Load analytics functions (Plausible + Segment)
 * @returns {Promise<object>} Object with all tracking functions
 */
export const loadAnalytics = async () => {
  const [plausible, segment] = await Promise.all([
    import('./plausible').catch(() => ({})),
    import('./segment').catch(() => ({}))
  ]);

  return {
    // Generic event tracking
    trackEvent: async (eventName, props) => {
      await Promise.all([
        plausible.trackEvent?.(eventName, props),
        segment.trackEvent?.(eventName, props)
      ]);
    },

    // Funnel tracking functions
    trackFormStart: async () => {
      await Promise.all([
        plausible.trackFormStart?.(),
        segment.trackFormStart?.()
      ]);
    },

    trackServicesSelected: async (servicesCount, serviceIds) => {
      await Promise.all([
        plausible.trackServicesSelected?.(servicesCount, serviceIds),
        segment.trackServicesSelected?.(servicesCount, serviceIds)
      ]);
    },

    trackDocumentsUploaded: async (documentsCount, servicesWithDocs) => {
      await Promise.all([
        plausible.trackDocumentsUploaded?.(documentsCount, servicesWithDocs),
        segment.trackDocumentsUploaded?.(documentsCount, servicesWithDocs)
      ]);
    },

    trackSignatoriesAdded: async (signatoriesCount) => {
      await Promise.all([
        plausible.trackSignatoriesAdded?.(signatoriesCount),
        segment.trackSignatoriesAdded?.(signatoriesCount)
      ]);
    },

    trackPersonalInfoCompleted: async (isAuthenticated) => {
      await Promise.all([
        plausible.trackPersonalInfoCompleted?.(isAuthenticated),
        segment.trackPersonalInfoCompleted?.(isAuthenticated)
      ]);
    },

    trackSummaryViewed: async (summaryData) => {
      await Promise.all([
        plausible.trackSummaryViewed?.(summaryData),
        segment.trackSummaryViewed?.(summaryData)
      ]);
    },

    trackPaymentInitiated: async (paymentData) => {
      await Promise.all([
        plausible.trackPaymentInitiated?.(paymentData),
        segment.trackPaymentInitiated?.(paymentData)
      ]);
    },

    trackPaymentCompleted: async (paymentData) => {
      await Promise.all([
        plausible.trackPaymentCompleted?.(paymentData),
        segment.trackPaymentCompleted?.(paymentData)
      ]);
    },

    trackFormAbandoned: async (currentStep, stepName) => {
      await Promise.all([
        plausible.trackFormAbandoned?.(currentStep, stepName),
        segment.trackFormAbandoned?.(currentStep, stepName)
      ]);
    },

    trackStepNavigation: async (fromStep, toStep, direction) => {
      await Promise.all([
        plausible.trackStepNavigation?.(fromStep, toStep, direction),
        segment.trackStepNavigation?.(fromStep, toStep, direction)
      ]);
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

export const trackStepNavigation = async (fromStep, toStep, direction) => {
  const analytics = await loadAnalytics();
  return analytics.trackStepNavigation(fromStep, toStep, direction);
};


/**
 * Google Tag Manager Utility for Notary Form
 * Helper functions to send events to GTM dataLayer
 * Compatible with GTM Web (client-side) and GTM Server-Side
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export const initGTM = () => {
  if (typeof window !== "undefined" && !window.dataLayer) {
    window.dataLayer = [];
  }
};

export const pushGTMEvent = (eventName: string, eventData: Record<string, unknown> = {}) => {
  if (typeof window === "undefined" || !window.dataLayer) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[GTM] dataLayer not initialized");
    }
    return;
  }

  const eventPayload = {
    event: eventName,
    event_name: eventName,
    ...eventData,
  };

  window.dataLayer.push(eventPayload);

  if (process.env.NODE_ENV === "development") {
    console.log("📊 [GTM] Event pushed:", eventPayload);
  }
};

export const trackPageView = (pageName: string, pagePath?: string) => {
  const pageLocation = typeof window !== "undefined" ? window.location.href : pagePath ?? "";
  const pageReferrer = typeof document !== "undefined" ? document.referrer || "" : "";
  const screenResolution =
    typeof window !== "undefined" && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : null;

  pushGTMEvent("page_view", {
    page_title: typeof document !== "undefined" ? document.title : "",
    page_location: pageLocation,
    page_path: typeof window !== "undefined" ? window.location.pathname : pagePath ?? "",
    page_name: pageName,
    page_referrer: pageReferrer,
    screen_resolution: screenResolution,
  });
};

export const trackFormStart = (options: {
  formName?: string;
  serviceType?: string;
  ctaLocation?: string;
  ctaText?: string;
} = {}) => {
  pushGTMEvent("form_start", {
    form_name: options.formName || "notarization_form",
    service_type: options.serviceType || "Document Notarization",
    cta_location: options.ctaLocation || "homepage_hero",
    cta_text: options.ctaText || "Commencer ma notarisation",
  });
};

export const trackFormStep = (stepNumber: number, stepName: string) => {
  pushGTMEvent("form_step_completed", {
    step_number: stepNumber,
    step_name: stepName,
  });
};

export const trackFormSubmissionStart = (formData: {
  selectedServices?: string[];
  serviceDocuments?: Record<string, unknown[]>;
}) => {
  const documentsCount = Object.values(formData.serviceDocuments ?? {}).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  pushGTMEvent("form_submission_start", {
    form_type: "notary_service",
    options_count: formData.selectedServices?.length ?? 0,
    documents_count: documentsCount,
  });
};

export const trackFormSubmission = (submissionData: {
  submissionId?: string;
  optionsCount?: number;
  documentsCount?: number;
}) => {
  pushGTMEvent("form_submit", {
    form_type: "notary_service",
    submission_id: submissionData.submissionId,
    options_count: submissionData.optionsCount ?? 0,
    documents_count: submissionData.documentsCount ?? 0,
  });
};

export const trackBeginCheckout = (checkoutData: {
  items?: Array<{ item_id?: string; item_name?: string; price?: number; quantity?: number }>;
  currency?: string;
  value?: number;
  amount?: number;
}) => {
  const items = (checkoutData.items || []).map((item) => ({
    item_id: item.item_id || "",
    item_name: item.item_name || "",
    item_category: "Notarization Service",
    price: item.price || 0,
    quantity: item.quantity || 1,
  }));

  pushGTMEvent("begin_checkout", {
    currency: checkoutData.currency || "EUR",
    value: checkoutData.value ?? checkoutData.amount ?? 0,
    items,
  });
};

/**
 * Track payment success (purchase event for Google Ads conversion)
 * Format identique à client-dashboard pour GTM Enhanced Conversions
 */
export const trackPaymentSuccess = (paymentData: {
  submissionId?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    postalCode?: string;
    country?: string;
  };
  selectedServices?: Array<{
    service_id?: string;
    id?: string;
    name?: string;
    service_name?: string;
    price?: number;
  }>;
  isFirstPurchase?: boolean;
  servicesCount?: number;
}) => {
  const eventData: Record<string, unknown> = {
    transaction_id: paymentData.submissionId,
    value: typeof paymentData.amount === "number" ? paymentData.amount : parseFloat(String(paymentData.amount)) || 0,
    currency: paymentData.currency || "EUR",
    user_data: {
      email: paymentData.userData?.email || "",
      phone_number: paymentData.userData?.phone || "",
      address: {
        first_name: paymentData.userData?.firstName || "",
        last_name: paymentData.userData?.lastName || "",
        postal_code: paymentData.userData?.postalCode || "",
        country: paymentData.userData?.country || "",
      },
    },
    items: (paymentData.selectedServices || []).map((service) => ({
      item_id: service.service_id || service.id || "",
      item_name: service.name || service.service_name || "",
      price: service.price || 0,
      quantity: 1,
    })),
    new_customer: paymentData.isFirstPurchase !== undefined ? paymentData.isFirstPurchase : true,
    services_count: paymentData.servicesCount ?? (paymentData.selectedServices || []).length,
  };
  pushGTMEvent("purchase", eventData);
};

export const trackPaymentFailure = (errorData: { message?: string; submissionId?: string }) => {
  pushGTMEvent("payment_failed", {
    error_message: errorData.message,
    submission_id: errorData.submissionId,
  });
};

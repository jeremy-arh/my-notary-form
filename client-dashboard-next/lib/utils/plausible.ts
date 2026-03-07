/**
 * Plausible Analytics - IDENTIQUE à client-dashboard/src/utils/plausible.js
 * Tracks form conversion funnel for Plausible Analytics
 * Documentation: https://plausible.io/docs/custom-event-goals
 */

declare global {
  interface Window {
    plausible?: ((eventName: string, options?: { props?: Record<string, unknown> }) => void) & { q?: unknown[] };
  }
}

const trackEvent = async (eventName: string, props: Record<string, unknown> = {}) => {
  if (typeof window === "undefined") return;

  const plausible = window.plausible;
  if (typeof plausible === "function") {
    try {
      if (Object.keys(props).length > 0) {
        plausible(eventName, { props });
      } else {
        plausible(eventName);
      }
    } catch {
      /* ignore */
    }
  }
};

/** Step 1: Form Started - User lands on the form */
export const trackFormStart = async () => {
  await trackEvent("form_started", { funnel_step: "1_form_started" });
};

/** Step 2: Services Selected */
export const trackServicesSelected = async (servicesCount: number, serviceIds: string[] = []) => {
  await trackEvent("services_selected", {
    funnel_step: "2_services_selected",
    services_count: servicesCount,
    service_ids: serviceIds.join(","),
  });
};

/** Step 3: Documents Uploaded */
export const trackDocumentsUploaded = async (documentsCount: number, servicesWithDocs: number) => {
  await trackEvent("documents_uploaded", {
    funnel_step: "3_documents_uploaded",
    documents_count: documentsCount,
    services_with_docs: servicesWithDocs,
  });
};

/** Step 3.5: Delivery Method Selected */
export const trackDeliveryMethodSelected = async (deliveryMethod: string) => {
  await trackEvent("delivery_method_selected", {
    funnel_step: "3.5_delivery_method_selected",
    delivery_method: deliveryMethod,
  });
};

/** Step 4: Signatories Added */
export const trackSignatoriesAdded = async (signatoriesCount: number) => {
  await trackEvent("signatories_added", {
    funnel_step: "4_signatories_added",
    signatories_count: signatoriesCount,
  });
};

/** Step 5: Personal Info Completed */
export const trackPersonalInfoCompleted = async (isAuthenticated = false) => {
  await trackEvent("personal_info_completed", {
    funnel_step: "5_personal_info_completed",
    is_authenticated: isAuthenticated,
  });
};

/** Step 6: Summary Viewed */
export const trackSummaryViewed = async (summaryData: {
  servicesCount?: number;
  documentsCount?: number;
  signatoriesCount?: number;
} = {}) => {
  await trackEvent("summary_viewed", {
    funnel_step: "6_summary_viewed",
    total_services: summaryData.servicesCount ?? 0,
    total_documents: summaryData.documentsCount ?? 0,
    total_signatories: summaryData.signatoriesCount ?? 0,
  });
};

/** Step 7: Payment Initiated */
export const trackPaymentInitiated = async (paymentData: {
  totalAmount?: number;
  servicesCount?: number;
  currency?: string;
} = {}) => {
  await trackEvent("payment_initiated", {
    funnel_step: "7_payment_initiated",
    total_amount: paymentData.totalAmount ?? 0,
    services_count: paymentData.servicesCount ?? 0,
    currency: paymentData.currency ?? "EUR",
  });
};

/** Step 8: Payment Completed */
export const trackPaymentCompleted = async (paymentData: {
  transactionId?: string;
  totalAmount?: number;
  submissionId?: string;
  currency?: string;
} = {}) => {
  await trackEvent("payment_completed", {
    funnel_step: "8_payment_completed",
    transaction_id: paymentData.transactionId ?? "",
    total_amount: paymentData.totalAmount ?? 0,
    submission_id: paymentData.submissionId ?? "",
    currency: paymentData.currency ?? "EUR",
  });
};

/** Track form abandonment */
export const trackFormAbandoned = async (currentStep: number, stepName: string) => {
  await trackEvent("form_abandoned", {
    abandoned_at_step: currentStep,
    step_name: stepName,
  });
};

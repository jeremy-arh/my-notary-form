/**
 * Plausible Analytics - Direct API Integration
 * Compatible with Next.js (client-side)
 * Documentation: https://plausible.io/docs/events-api
 */

const PLAUSIBLE_DOMAIN = "mynotary.io";
const PLAUSIBLE_API = "https://plausible.io/api/event";

const sendToPlausible = async (eventData: Record<string, unknown>) => {
  if (typeof window === "undefined") return;

  try {
    await fetch(PLAUSIBLE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: PLAUSIBLE_DOMAIN,
        ...eventData,
      }),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Plausible] Tracking error:", error);
    }
  }
};

export const trackPageView = (pageName: string, pagePath?: string) => {
  sendToPlausible({
    name: "pageview",
    url: pagePath || (typeof window !== "undefined" ? window.location.href : ""),
    props: { page_name: pageName },
  });
};

export const trackEvent = (eventName: string, props: Record<string, unknown> = {}) => {
  sendToPlausible({
    name: eventName,
    url: typeof window !== "undefined" ? window.location.href : "",
    props,
  });
};

export const trackFormStep = (stepNumber: number, stepName: string) => {
  trackEvent("form_step_completed", {
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
  trackEvent("form_submission_start", {
    form_type: "notary_service",
    options_count: formData.selectedServices?.length ?? 0,
    documents_count: documentsCount,
  });
};

export const trackPaymentSuccess = (paymentData: {
  transactionId?: string;
  amount?: number;
  currency?: string;
  submissionId?: string;
}) => {
  trackEvent("payment_success", {
    transaction_id: paymentData.transactionId,
    value: paymentData.amount,
    currency: paymentData.currency || "EUR",
    submission_id: paymentData.submissionId,
  });
};

export const trackPaymentFailure = (errorData: { message?: string; submissionId?: string }) => {
  trackEvent("payment_failure", {
    error_message: errorData.message,
    submission_id: errorData.submissionId,
  });
};

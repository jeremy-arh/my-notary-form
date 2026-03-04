/**
 * Plausible Analytics - via window.plausible() (client-side)
 * Requires the Plausible script to be loaded (see components/Analytics.tsx)
 */

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, unknown>; callback?: () => void }) => void;
  }
}

const trackEvent = (eventName: string, props: Record<string, unknown> = {}) => {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;
  window.plausible(eventName, Object.keys(props).length > 0 ? { props } : undefined);
};

export const trackPageView = (pageName: string) => {
  trackEvent("pageview", { page_name: pageName });
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

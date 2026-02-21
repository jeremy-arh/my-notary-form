"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { trackPaymentSuccess as trackPaymentSuccessPlausible } from "@/lib/utils/plausible";
import { trackPaymentSuccess } from "@/lib/utils/gtm";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const sessionId = searchParams.get("session_id");

        if (!sessionId) {
          setError("No payment session found");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Verification failed");

        if (data?.verified && data.submissionId) {
          setSubmissionId(data.submissionId);
          setInvoiceUrl(data.invoiceUrl ?? null);

          // Clear form data from localStorage
          try {
            localStorage.removeItem("notaryFormData");
            localStorage.removeItem("formSessionId");
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith("notary") || key.startsWith("form"))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
          } catch {
            /* ignore */
          }

          // Track payment success (Plausible + GTM)
          // Format dataLayer identique à client-dashboard pour Google Ads
          trackPaymentSuccessPlausible({
            transactionId: data.transactionId || sessionId,
            amount: data.amount ?? 0,
            currency: data.currency || "EUR",
            submissionId: data.submissionId,
          });
          trackPaymentSuccess({
            submissionId: data.submissionId,
            transactionId: data.transactionId || sessionId,
            amount: data.amount ?? 0,
            currency: data.currency || "EUR",
            userData: data.userData || {},
            selectedServices: data.selectedServices || [],
            isFirstPurchase: data.isFirstPurchase !== undefined ? data.isFirstPurchase : true,
            servicesCount: data.servicesCount ?? 0,
          });
        } else {
          setError(data?.error ?? "Payment verification failed");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to verify payment";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#491ae9] mb-4" />
          <p className="text-gray-600 font-medium">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="heroicons:x-mark" className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/form/summary"
            className="inline-block px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Back to Form
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col items-center space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <Icon icon="heroicons:check-circle" className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment Successful!</h1>
        <p className="text-gray-600 text-center">
          Thank you for your payment. Your notary request has been submitted successfully.
        </p>
        {submissionId && (
          <div className="w-full bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Submission ID</p>
            <p className="text-lg font-bold text-gray-900 font-mono">{submissionId.substring(0, 8)}</p>
          </div>
        )}
        {invoiceUrl && (
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold hover:underline"
          >
            Download Invoice →
          </a>
        )}
        <Link
          href="/dashboard"
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Icon icon="heroicons:squares-2x2" className="w-5 h-5" />
          Go to Dashboard
          <Icon icon="heroicons:arrow-right" className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

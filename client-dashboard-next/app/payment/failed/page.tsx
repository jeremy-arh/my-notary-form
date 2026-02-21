"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { trackPaymentFailure as trackPaymentFailurePlausible } from "@/lib/utils/plausible";
import { trackPaymentFailure } from "@/lib/utils/gtm";
import { useEffect } from "react";

export default function PaymentFailedPage() {
  useEffect(() => {
    trackPaymentFailurePlausible({ message: "Payment cancelled or failed" });
    trackPaymentFailure({ message: "Payment cancelled or failed" });
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center">
        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon icon="heroicons:exclamation-triangle" className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h2>
        <p className="text-gray-600 mb-6">
          Your payment was cancelled or could not be completed. You can try again from the summary page.
        </p>
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

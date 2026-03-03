"use client";

import { useEffect } from "react";

export default function FormError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Une erreur est survenue</h2>
        <p className="text-gray-600 mb-6">Le formulaire a rencontré une erreur. Vous pouvez réessayer ou retourner au début.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            Réessayer
          </button>
          <a
            href="/form"
            className="px-6 py-3 border border-gray-300 font-medium rounded-xl hover:bg-gray-50 transition-colors inline-block"
          >
            Recommencer le formulaire
          </a>
        </div>
      </div>
    </div>
  );
}

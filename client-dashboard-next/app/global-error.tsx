"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Une erreur critique est survenue</h2>
          <p className="text-gray-600 mb-6">Désolé, une erreur inattendue s&apos;est produite.</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}

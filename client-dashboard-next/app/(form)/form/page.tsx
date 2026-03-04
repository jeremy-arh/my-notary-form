"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { initialFormData } from "@/lib/formData";
import { getResumePath, getResumeStepIndex } from "@/lib/formResume";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "notaryFormData";
const SESSION_KEY = "formSessionId";

const STEP_LABELS = [
  "Personal info",
  "Choose services",
  "Upload documents",
  "Signatories",
  "Delivery",
  "Summary",
];

type ResumeData = {
  formData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    selectedServices?: string[];
    serviceDocuments?: Record<string, unknown[]>;
    signatories?: unknown[];
    deliveryMethod?: string | null;
    currency?: string;
    submissionId?: string;
    sessionId?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
};

/**
 * Point d'entrée du formulaire.
 *
 * Priorités :
 * 1. ?submissionId=xxx → charge la soumission directement (lien mail / cross-device), sans popup
 * 2. Soumission en cours trouvée (auth ou localStorage) → popup "Reprendre ou Recommencer"
 * 3. Sinon → redirect direct vers l'étape adéquate
 */
export default function FormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  const extraSearch = (() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("submissionId");
    return p.toString();
  })();

  const redirect = (path: string) => {
    router.replace(extraSearch ? `${path}?${extraSearch}` : path);
  };

  const applyAndRedirect = (fd: ResumeData["formData"]) => {
    const { sessionId, submissionId, ...rest } = fd;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, submissionId }));
    if (sessionId) window.localStorage.setItem(SESSION_KEY, String(sessionId));
    const path = getResumePath({ ...initialFormData, ...rest });
    redirect(path);
  };

  const startFresh = async () => {
    // Abandonner les soumissions en cours en DB avant de nettoyer localStorage
    const email = resumeData?.formData?.email?.trim();
    const submissionId = resumeData?.formData?.submissionId;
    try {
      if (email || submissionId) {
        await fetch("/api/abandon-submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submissionId ? { submissionIds: [submissionId] } : { email }),
        });
      }
    } catch { /* ignore */ }
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    redirect("/form/personal-info");
  };

  useEffect(() => {
    const run = async () => {
      const submissionIdParam = searchParams.get("submissionId");

      // --- 1. submissionId dans l'URL : reprendre sans popup (lien mail) ---
      if (submissionIdParam) {
        try {
          const res = await fetch(`/api/active-submission?submissionId=${encodeURIComponent(submissionIdParam)}`);
          const { formData } = await res.json();
          if (formData) {
            applyAndRedirect(formData);
            return;
          }
        } catch { /* ignore */ }
      }

      // --- 2. Chercher une soumission en cours (auth ou localStorage) ---
      let found: ResumeData | null = null;

      // 2a. Utilisateur authentifié → cherche en DB
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const res = await fetch(`/api/active-submission?email=${encodeURIComponent(user.email)}`);
          const { formData, submission } = await res.json();
          if (formData && (formData.selectedServices?.length > 0 || formData.firstName)) {
            found = { formData, createdAt: submission?.created_at };
          }
        }
      } catch { /* ignore */ }

      // 2b. Si pas trouvé en DB, regarder localStorage
      if (!found) {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const local = { ...initialFormData, ...(JSON.parse(raw) as typeof initialFormData) };
            const hasProgress = (local.selectedServices?.length ?? 0) > 0 || !!local.firstName?.trim();
            if (hasProgress) {
              found = { formData: local };
            }
          }
        } catch { /* ignore */ }
      }

      // --- 3. Si des données en cours trouvées → afficher le popup ---
      if (found) {
        setResumeData(found);
        return;
      }

      // --- 4. Aucune donnée → redirect vers personal-info ---
      redirect("/form/personal-info");
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Popup de reprise ---
  if (resumeData) {
    const fd = resumeData.formData;
    const stepIndex = getResumeStepIndex({ ...initialFormData, ...fd });
    const stepLabel = STEP_LABELS[stepIndex] ?? "Summary";
    const servicesCount = fd.selectedServices?.length ?? 0;
    const docsCount = Object.values(fd.serviceDocuments ?? {}).reduce(
      (acc: number, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
      0
    );
    const sigsCount = Array.isArray(fd.signatories) ? fd.signatories.length : 0;
    const delivery = fd.deliveryMethod;
    const name = [fd.firstName, fd.lastName].filter(Boolean).join(" ");

    const formattedDate = resumeData.createdAt
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(resumeData.createdAt))
      : null;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-base font-semibold text-gray-900">You have an unfinished request</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {formattedDate ? `Started on ${formattedDate}` : "Pick up where you left off or start fresh."}
            </p>
          </div>

          {/* Recap */}
          <div className="px-6 pb-4 space-y-3">
            {name && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Icon icon="heroicons:user" className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium">{name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Icon icon="heroicons:map-pin" className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Stopped at: <span className="font-semibold text-gray-900">{stepLabel}</span></span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { value: servicesCount, label: servicesCount > 1 ? "Services" : "Service" },
                { value: docsCount, label: docsCount > 1 ? "Documents" : "Document" },
                { value: sigsCount, label: sigsCount > 1 ? "Signatories" : "Signatory" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {delivery && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {delivery === "postal"
                  ? <Icon icon="heroicons:envelope" className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <span className="w-4 h-4 text-center font-bold text-gray-400 leading-none text-base flex-shrink-0">@</span>
                }
                <span>Delivery: <span className="font-medium text-gray-900">{delivery === "postal" ? "Postal" : "Email"}</span></span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="mx-6 border-t border-gray-100" />

          {/* Actions */}
          <div className="px-6 py-4 space-y-2">
            <button
              onClick={() => applyAndRedirect(fd)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-md"
            >
              <Icon icon="heroicons:arrow-path" className="w-4 h-4" />
              Resume my request
            </button>
            <button
              onClick={startFresh}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-gray-500 hover:text-gray-800 font-medium text-sm transition-colors rounded-xl hover:bg-gray-50"
            >
              Start a new request
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#F3F4F6]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#491ae9] border-t-transparent" />
    </div>
  );
}

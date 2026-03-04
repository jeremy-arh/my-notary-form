"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { initialFormData } from "@/lib/formData";
import { getResumePath } from "@/lib/formResume";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "notaryFormData";
const SESSION_KEY = "formSessionId";

/**
 * Point d'entrée du formulaire — ne fait que rediriger.
 *
 * 1. ?submissionId=xxx → charge la soumission et redirige vers l'étape en cours (lien mail)
 * 2. Soumission en cours trouvée (auth ou localStorage) → stocke dans sessionStorage et redirige
 *    vers personal-info qui affichera le popup de reprise sur du vrai contenu (avec flou correct)
 * 3. Sinon → personal-info vierge
 */
export default function FormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const extraSearch = (() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("submissionId");
    return p.toString();
  })();

  const redirect = (path: string) => {
    router.replace(extraSearch ? `${path}?${extraSearch}` : path);
  };

  useEffect(() => {
    const run = async () => {
      const submissionIdParam = searchParams.get("submissionId");

      // --- 1. submissionId dans l'URL : charger et rediriger directement ---
      if (submissionIdParam) {
        try {
          const res = await fetch(`/api/active-submission?submissionId=${encodeURIComponent(submissionIdParam)}`);
          const { formData } = await res.json();
          if (formData) {
            const { sessionId, submissionId, ...rest } = formData;
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, submissionId }));
            if (sessionId) window.localStorage.setItem(SESSION_KEY, String(sessionId));
            const path = getResumePath({ ...initialFormData, ...rest });
            redirect(path);
            return;
          }
        } catch { /* ignore */ }
      }

      // --- 2. Chercher une soumission en cours ---
      type ResumeData = { formData: Record<string, unknown>; createdAt?: string };
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

      // 2b. localStorage
      if (!found) {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const local = { ...initialFormData, ...(JSON.parse(raw) as typeof initialFormData) };
            const hasProgress = (local.selectedServices?.length ?? 0) > 0 || !!local.firstName?.trim();
            if (hasProgress) found = { formData: local as Record<string, unknown> };
          }
        } catch { /* ignore */ }
      }

      // --- 3. Stocker les données de reprise et aller sur personal-info ---
      // Le popup de reprise s'affiche sur personal-info pour avoir du vrai contenu à flouter
      if (found) {
        try { sessionStorage.setItem("pendingResume", JSON.stringify(found)); } catch { /* ignore */ }
      }
      redirect("/form/personal-info");
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#F3F4F6]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#491ae9] border-t-transparent" />
    </div>
  );
}

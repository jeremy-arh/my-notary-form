"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { initialFormData } from "@/lib/formData";
import { getResumePath } from "@/lib/formResume";
import { createClient } from "@/lib/supabase/client";
import { useFormData } from "@/contexts/FormContext";

const STORAGE_KEY = "notaryFormData";
const SESSION_KEY = "formSessionId";

/**
 * Point d'entrée du formulaire — ne fait que rediriger.
 *
 * 1. ?submissionId=xxx → charge la soumission et redirige vers l'étape en cours (lien mail)
 * 2. Utilisateur authentifié avec soumission en cours → préremplit localStorage et redirige
 * 3. Sinon → personal-info (vierge ou depuis localStorage)
 * La reprise est automatique : si une soumission en cours existe pour l'email, elle est chargée sans popup.
 */
export default function FormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateFormData } = useFormData();

  const extraSearch = (() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("submissionId");
    p.delete("submission-id");
    return p.toString();
  })();

  const redirect = (path: string) => {
    router.replace(extraSearch ? `${path}?${extraSearch}` : path);
  };

  const applyFormData = (formData: Record<string, unknown>) => {
    const { sessionId, submissionId, ...rest } = formData;
    const toApply = { ...initialFormData, ...rest, submissionId };
    updateFormData(toApply);
    const serialized = JSON.stringify({ ...rest, submissionId });
    window.localStorage.setItem(STORAGE_KEY, serialized);
    if (sessionId) window.localStorage.setItem(SESSION_KEY, String(sessionId));
    return getResumePath(toApply as typeof initialFormData);
  };

  useEffect(() => {
    const run = async () => {
      const submissionIdParam = searchParams.get("submissionId") ?? searchParams.get("submission-id");

      // --- 1. submissionId dans l'URL : charger et rediriger directement ---
      if (submissionIdParam) {
        try {
          const res = await fetch(`/api/active-submission?submissionId=${encodeURIComponent(submissionIdParam)}`);
          const { formData } = await res.json();
          if (formData) {
            const path = applyFormData(formData);
            redirect(path);
            return;
          }
        } catch { /* ignore */ }
      }

      // --- 2. Chercher une soumission en cours (utilisateur authentifié) → reprise automatique ---
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const res = await fetch(`/api/active-submission?email=${encodeURIComponent(user.email)}`);
          const { formData, submission } = await res.json();
          if (formData && submission && (formData.selectedServices?.length > 0 || formData.firstName)) {
            const path = applyFormData(formData);
            redirect(path);
            return;
          }
        }
      } catch { /* ignore */ }

      // 3. Pas de soumission en cours → personal-info (vierge ou depuis localStorage)
      redirect("/form/personal-info");
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F3F4F6]">
      <Skeleton className="h-14 sm:h-16 rounded-none" />
      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-3/4 rounded-xl" />
        </div>
      </div>
      <div className="h-1 bg-gray-200" />
      <Skeleton className="h-16 rounded-none" />
    </div>
  );
}

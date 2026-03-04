"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { initialFormData } from "@/lib/formData";
import { getResumePath } from "@/lib/formResume";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "notaryFormData";
const SESSION_KEY = "formSessionId";

/**
 * Point d'entrée du formulaire — ne fait que rediriger.
 *
 * 1. ?submissionId=xxx → charge la soumission et redirige vers l'étape en cours (lien mail)
 * 2. Utilisateur authentifié avec soumission en cours → préremplit localStorage et redirige
 * 3. Sinon → personal-info (vierge ou depuis localStorage)
 * Le popup de reprise n'apparaît que lors du clic sur Continuer si l'email correspond à une soumission non payée sur un autre appareil.
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

      // --- 2. Chercher une soumission en cours (autre appareil ou localStorage) ---
      // 2a. Utilisateur authentifié → charge depuis la DB et préremplit le formulaire
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const res = await fetch(`/api/active-submission?email=${encodeURIComponent(user.email)}`);
          const { formData, submission } = await res.json();
          if (formData && submission && (formData.selectedServices?.length > 0 || formData.firstName)) {
            const { sessionId, submissionId, ...rest } = formData;
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, submissionId }));
            if (sessionId) window.localStorage.setItem(SESSION_KEY, String(sessionId));
          }
        }
      } catch { /* ignore */ }

      // 2b. localStorage : déjà présent, pas d'action nécessaire
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

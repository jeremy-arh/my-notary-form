"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { initialFormData } from "@/lib/formData";
import { getResumePath } from "@/lib/formResume";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "notaryFormData";
const SESSION_KEY = "formSessionId";

/**
 * Point d'entrée du formulaire.
 *
 * Priorités :
 * 1. ?submissionId=xxx dans l'URL → charge cette soumission spécifique (lien mail)
 * 2. Utilisateur authentifié → cherche sa soumission pending_payment en cours
 * 3. Sinon → localStorage ou départ vierge
 *
 * Dans tous les cas, une seule soumission pending_payment par email est permise.
 */
export default function FormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const submissionIdParam = searchParams.get("submissionId");
      const otherParams = new URLSearchParams(searchParams.toString());
      otherParams.delete("submissionId");
      const extraSearch = otherParams.toString();

      const redirect = (path: string) => {
        router.replace(extraSearch ? `${path}?${extraSearch}` : path);
      };

      // --- 1. submissionId dans l'URL : reprendre depuis un lien mail ---
      if (submissionIdParam) {
        try {
          const res = await fetch(`/api/active-submission?submissionId=${encodeURIComponent(submissionIdParam)}`);
          const { formData } = await res.json();
          if (formData) {
            const { sessionId, submissionId, ...rest } = formData;
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, submissionId }));
            if (sessionId) window.localStorage.setItem(SESSION_KEY, sessionId);
            const path = getResumePath({ ...initialFormData, ...rest });
            redirect(path);
            return;
          }
        } catch {
          /* ignore, continue normal flow */
        }
      }

      // --- 2. Utilisateur authentifié : vérifier soumission en cours ---
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const res = await fetch(`/api/active-submission?email=${encodeURIComponent(user.email)}`);
          const { formData } = await res.json();
          if (formData) {
            const { sessionId, submissionId, ...rest } = formData;
            // Charge la soumission en cours dans localStorage
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, submissionId }));
            if (sessionId) window.localStorage.setItem(SESSION_KEY, sessionId);
            const path = getResumePath({ ...initialFormData, ...rest });
            redirect(path);
            return;
          }
        }
      } catch {
        /* ignore, continue normal flow */
      }

      // --- 3. Reprise normale depuis localStorage ---
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const formData = raw ? { ...initialFormData, ...(JSON.parse(raw) as typeof initialFormData) } : initialFormData;
        const path = getResumePath(formData);
        const search = searchParams.toString();
        router.replace(search ? `${path}?${search}` : path);
      } catch {
        const search = searchParams.toString();
        router.replace(search ? `/form/personal-info?${search}` : "/form/personal-info");
      }
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] px-4">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#491ae9] border-t-transparent" />
    </div>
  );
}

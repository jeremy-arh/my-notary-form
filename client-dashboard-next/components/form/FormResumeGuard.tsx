"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getResumePath } from "@/lib/formResume";
import { initialFormData, type FormData } from "@/lib/formData";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "notaryFormData";
// Flag stocké en sessionStorage pour éviter de re-checker à chaque navigation
const CHECKED_KEY = "formSessionChecked";

const FORM_STEP_PATHS = [
  "/form/personal-info",
  "/form/choose-services",
  "/form/documents",
  "/form/signatories",
  "/form/delivery",
  "/form/summary",
] as const;

/**
 * - Redirige vers la bonne étape selon la progression (localStorage)
 * - Si l'utilisateur arrive directement sur une étape sans passer par /form,
 *   vérifie une fois par session si une soumission en cours existe en DB
 *   et redirige vers /form pour reprise automatique.
 */
export default function FormResumeGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dbChecked = useRef(false);

  // Vérification DB une seule fois par session (user qui bypasse /form)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname === "/form") return;
    if (dbChecked.current) return;
    if (sessionStorage.getItem(CHECKED_KEY)) return;

    dbChecked.current = true;
    sessionStorage.setItem(CHECKED_KEY, "1");

    const checkDB = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return;

        const res = await fetch(`/api/active-submission?email=${encodeURIComponent(user.email)}`);
        const { formData: dbFormData, submission } = await res.json();
        if (!dbFormData || !submission) return;

        // Il y a une soumission en cours en DB
        // Vérifier si le localStorage est vide ou différent
        let localData: FormData = initialFormData;
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) localData = { ...initialFormData, ...(JSON.parse(raw) as Partial<FormData>) };
        } catch { /* ignore */ }

        const localSubmissionId = (localData as { submissionId?: string }).submissionId;
        // Si le localStorage pointe déjà sur la même soumission, pas besoin de popup
        if (localSubmissionId && localSubmissionId === submission.id) return;

        // localStorage vide ou différent → rediriger vers /form pour reprise automatique
        const search = searchParams.toString();
        router.replace(search ? `/form?${search}` : "/form");
      } catch { /* ignore */ }
    };

    checkDB();
  }, [pathname, router, searchParams]);

  // Redirection locale basée sur localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !pathname?.startsWith("/form")) return;
    if (pathname === "/form") return;

    let formData: FormData = initialFormData;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) formData = { ...initialFormData, ...(JSON.parse(raw) as Partial<FormData>) };
    } catch { /* ignore */ }

    const serviceParam = searchParams.get("service");
    const hasServiceFromUrl = !!serviceParam && (formData.selectedServices?.length ?? 0) > 0;

    if (pathname === "/form/choose-services" && hasServiceFromUrl) {
      const search = searchParams.toString();
      router.replace(search ? `/form/documents?${search}` : "/form/documents");
      return;
    }

    const resumePath = getResumePath(formData);
    const currentIndex = FORM_STEP_PATHS.indexOf(pathname as (typeof FORM_STEP_PATHS)[number]);
    const resumeIndex = FORM_STEP_PATHS.indexOf(resumePath as (typeof FORM_STEP_PATHS)[number]);

    if (currentIndex === -1) return;
    if (currentIndex > resumeIndex) {
      const search = searchParams.toString();
      router.replace(search ? `${resumePath}?${search}` : resumePath);
    }
  }, [pathname, router, searchParams]);

  // Réinitialiser le flag quand l'utilisateur passe par /form
  useEffect(() => {
    if (pathname === "/form") {
      sessionStorage.removeItem(CHECKED_KEY);
    }
  }, [pathname]);

  return null;
}

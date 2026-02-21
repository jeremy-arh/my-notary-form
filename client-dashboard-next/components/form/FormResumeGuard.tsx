"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getResumePath } from "@/lib/formResume";
import { initialFormData, type FormData } from "@/lib/formData";

const STORAGE_KEY = "notaryFormData";
const FORM_STEP_PATHS = [
  "/form/personal-info",
  "/form/choose-services",
  "/form/documents",
  "/form/delivery",
  "/form/summary",
] as const;

/**
 * Redirige uniquement quand l'utilisateur est sur une étape EN AVANT de sa progression
 * (ex: recharge sur /form/documents sans avoir sélectionné de services).
 * Si ?service= est présent et un service est déjà sélectionné, bloque l'accès à choose-services
 * et redirige vers documents (comme l'ancienne version).
 */
export default function FormResumeGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname?.startsWith("/form")) return;
    if (pathname === "/form") return; // La page /form gère déjà la redirection

    let formData: FormData = initialFormData;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) formData = { ...initialFormData, ...(JSON.parse(raw) as Partial<FormData>) };
    } catch {
      /* ignore */
    }

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

  return null;
}

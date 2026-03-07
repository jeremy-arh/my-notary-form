"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useFormData } from "@/contexts/FormContext";
import { useServices } from "@/contexts/ServicesContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { saveSubmission, type SaveResult } from "@/lib/saveSubmission";
import { createClient } from "@/lib/supabase/client";
import { calculateTotalAmount } from "@/lib/utils/pricing";
import { initCrisp } from "@/lib/utils/crisp";
import { useTranslation } from "@/hooks/useTranslation";
import { getStepValidation } from "@/lib/utils/stepValidation";
import {
  trackFormStart as trackFormStartPlausible,
  trackPersonalInfoCompleted,
  trackServicesSelected,
  trackDocumentsUploaded,
  trackSignatoriesAdded,
  trackDeliveryMethodSelected,
} from "@/lib/utils/plausible";
import { trackPageView, trackFormStep, trackFormStart } from "@/lib/utils/gtm";
import { toast } from "sonner";
import FormLayoutContent from "./FormLayoutContent";

const FORM_STEPS = [
  { id: 1, path: "/form/personal-info", name: "Your personal informations", icon: "heroicons:user" },
  { id: 2, path: "/form/choose-services", name: "Choose Services", icon: "heroicons:squares-2x2" },
  { id: 3, path: "/form/documents", name: "Upload Documents", icon: "heroicons:document" },
  { id: 4, path: "/form/signatories", name: "Add Signatories", icon: "heroicons:user-group" },
  { id: 5, path: "/form/delivery", name: "Delivery method", icon: "heroicons:truck" },
  { id: 6, path: "/form/summary", name: "Summary", icon: "heroicons:clipboard-document-check" },
];

export default function FormLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { formData } = useFormData();
  const { servicesMap, optionsMap } = useServices();
  const { currency } = useCurrency();
  const { triggerContinue, isUploading, getStepValidationOverride } = useFormActions();
  const { t } = useTranslation();
  const [isContinuing, setIsContinuing] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [hasShownInactivityModal, setHasShownInactivityModal] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("inactivityModalShown") === "true";
  });

  const currentStep = FORM_STEPS.findIndex((s) => s.path === pathname) + 1 || 1;
  const override = getStepValidationOverride(pathname);
  const stepValidation = override ? override() : getStepValidation(pathname, formData, isUploading);
  const completedSteps: number[] = [];
  for (let i = 0; i < currentStep - 1; i++) completedSteps.push(i);
  const hasTrackedFormStart = useRef(false);

  useEffect(() => {
    const stepData = FORM_STEPS.find((s) => s.path === pathname);
    if (stepData) {
      document.title = stepData.name;
    } else if (pathname === "/form") {
      document.title = "Form";
    }
  }, [pathname]);

  useEffect(() => {
    const stepData = FORM_STEPS.find((s) => s.path === pathname);
    if (stepData) {
      trackPageView(stepData.name, pathname);
      if (currentStep === 1 && !hasTrackedFormStart.current) {
        hasTrackedFormStart.current = true;
        trackFormStartPlausible();
        trackFormStart({
          formName: "notarization_form",
          serviceType: "Document Notarization",
          ctaLocation: "homepage_hero",
          ctaText: "Commencer ma notarisation",
        });
      }
    }
  }, [pathname, currentStep]);

  const doSave = useCallback(async (opts?: { createAccount?: boolean }): Promise<SaveResult> => {
    const hasProgress =
      (formData.selectedServices?.length ?? 0) > 0 ||
      Object.keys(formData.serviceDocuments ?? {}).length > 0 ||
      !!formData.firstName?.trim() ||
      !!formData.lastName?.trim() ||
      !!formData.email?.trim() ||
      !!formData.gclid?.trim();
    if (!hasProgress) return null;
    const totalAmount = calculateTotalAmount(formData, servicesMap, optionsMap, currency);
    return saveSubmission(formData, currentStep, completedSteps, totalAmount, opts);
  }, [formData, currentStep, completedSteps, servicesMap, optionsMap, currency]);

  useEffect(() => {
    initCrisp();
  }, []);

  useEffect(() => {
    const timer = setTimeout(doSave, 2000);
    return () => clearTimeout(timer);
  }, [doSave]);

  useEffect(() => {
    if (currentStep === 6 || isContinuing || hasShownInactivityModal || showInactivityModal) return;
    if (currentStep === 1 && !formData.firstName?.trim() && !formData.lastName?.trim() && !formData.email?.trim()) return;

    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let lastActivityTime = Date.now();

    const resetTimer = (e?: Event) => {
      if (e?.target && (e.target as Element).closest("[data-inactivity-modal]")) return;
      lastActivityTime = Date.now();
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (Date.now() - lastActivityTime >= 15000 && !hasShownInactivityModal) {
          setShowInactivityModal(true);
          setHasShownInactivityModal(true);
          sessionStorage.setItem("inactivityModalShown", "true");
        }
      }, 15000);
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach((ev) => document.addEventListener(ev, resetTimer, true));
    resetTimer();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach((ev) => document.removeEventListener(ev, resetTimer, true));
    };
  }, [currentStep, isContinuing, hasShownInactivityModal, showInactivityModal, formData.firstName, formData.lastName, formData.email]);

  const handleContinue = useCallback(async () => {
    if (isContinuing) return;
    if (!stepValidation.isComplete) {
      if (stepValidation.errorKey) toast.error(t(stepValidation.errorKey));
      return;
    }
    setIsContinuing(true);
    try {
      const stepData = FORM_STEPS[currentStep - 1];
      if (stepData) trackFormStep(currentStep, stepData.name);

      // Plausible funnel events - exactement comme client-dashboard
      if (currentStep === 1) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        trackPersonalInfoCompleted(!!user);
      } else if (currentStep === 2) {
        trackServicesSelected(
          formData.selectedServices?.length ?? 0,
          formData.selectedServices ?? []
        );
      } else if (currentStep === 3) {
        const totalDocs = Object.values(formData.serviceDocuments ?? {}).reduce(
          (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
          0
        );
        const servicesWithDocs = Object.keys(formData.serviceDocuments ?? {}).length;
        trackDocumentsUploaded(totalDocs, servicesWithDocs);
      } else if (currentStep === 4) {
        trackSignatoriesAdded(formData.signatories?.length ?? 0);
      } else if (currentStep === 5) {
        trackDeliveryMethodSelected(formData.deliveryMethod ?? "email");
      }

      const isPersonalInfoStep = currentStep === 1;
      const result = await doSave(isPersonalInfoStep ? { createAccount: true } : undefined);

      // Auto-login après inscription à l'étape personal-info
      if (isPersonalInfoStep && result?.autoLoginAccessToken && result?.autoLoginRefreshToken) {
        console.log("[handleContinue] Auto-login: setting session...");
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.setSession({
            access_token: result.autoLoginAccessToken,
            refresh_token: result.autoLoginRefreshToken,
          });
          if (error) {
            console.warn("[handleContinue] Auto-login setSession failed:", error.message);
          } else {
            console.log("[handleContinue] Auto-login SUCCESS");
          }
        } catch (e) {
          console.warn("[handleContinue] Auto-login error:", e);
        }
      }

      await triggerContinue();
    } finally {
      setIsContinuing(false);
    }
  }, [doSave, triggerContinue, currentStep, stepValidation.isComplete, stepValidation.errorKey, t]);

  const prevStep = () => {
    const idx = FORM_STEPS.findIndex((s) => s.path === pathname);
    if (idx > 0) router.push(FORM_STEPS[idx - 1].path);
  };

  const handleCloseInactivityModal = () => {
    setShowInactivityModal(false);
    setHasShownInactivityModal(true);
    sessionStorage.setItem("inactivityModalShown", "true");
  };

  return (
    <FormLayoutContent
      currentStep={currentStep}
      stepValidation={stepValidation}
      isContinuing={isContinuing}
      isUploading={isUploading}
      showInactivityModal={showInactivityModal}
      onPrevStep={prevStep}
      onContinue={handleContinue}
      onCloseInactivityModal={handleCloseInactivityModal}
      t={t}
    >
      {children}
    </FormLayoutContent>
  );
}

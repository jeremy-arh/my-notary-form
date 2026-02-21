"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useFormData } from "@/contexts/FormContext";
import { useServices } from "@/contexts/ServicesContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { saveSubmission } from "@/lib/saveSubmission";
import { calculateTotalAmount } from "@/lib/utils/pricing";
import { initCrisp, openCrisp } from "@/lib/utils/crisp";
import { useTranslation } from "@/hooks/useTranslation";
import { trackPageView as trackPageViewPlausible, trackFormStep as trackFormStepPlausible } from "@/lib/utils/plausible";
import { trackPageView, trackFormStep, trackFormStart } from "@/lib/utils/gtm";
import LanguageSelector from "./LanguageSelector";
import CurrencySelector from "./CurrencySelector";
import InactivityModal from "./InactivityModal";

const FORM_STEPS = [
  { id: 1, path: "/form/personal-info", name: "Your personal informations", icon: "heroicons:user" },
  { id: 2, path: "/form/choose-services", name: "Choose Services", icon: "heroicons:squares-2x2" },
  { id: 3, path: "/form/documents", name: "Upload Documents", icon: "heroicons:document" },
  { id: 4, path: "/form/delivery", name: "Delivery method", icon: "heroicons:truck" },
  { id: 5, path: "/form/summary", name: "Summary", icon: "heroicons:clipboard-document-check" },
];

export default function FormLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { formData } = useFormData();
  const { servicesMap, optionsMap } = useServices();
  const { currency } = useCurrency();
  const { triggerContinue, isUploading } = useFormActions();
  const { t } = useTranslation();
  const [isContinuing, setIsContinuing] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [hasShownInactivityModal, setHasShownInactivityModal] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("inactivityModalShown") === "true";
  });

  const currentStep = FORM_STEPS.findIndex((s) => s.path === pathname) + 1 || 1;
  const completedSteps: number[] = [];
  for (let i = 0; i < currentStep - 1; i++) completedSteps.push(i);
  const hasTrackedFormStart = useRef(false);

  // Update document title to step name (no My Notary)
  useEffect(() => {
    const stepData = FORM_STEPS.find((s) => s.path === pathname);
    if (stepData) {
      document.title = stepData.name;
    } else if (pathname === "/form") {
      document.title = "Form";
    }
  }, [pathname]);

  // Track page view + form_start (Plausible + GTM)
  useEffect(() => {
    const stepData = FORM_STEPS.find((s) => s.path === pathname);
    if (stepData) {
      trackPageViewPlausible(stepData.name, pathname);
      trackPageView(stepData.name, pathname);
      if (currentStep === 1 && !hasTrackedFormStart.current) {
        hasTrackedFormStart.current = true;
        trackFormStart({
          formName: "notarization_form",
          serviceType: "Document Notarization",
          ctaLocation: "homepage_hero",
          ctaText: "Commencer ma notarisation",
        });
      }
    }
  }, [pathname, currentStep]);

  const doSave = useCallback(async () => {
    const hasProgress =
      (formData.selectedServices?.length ?? 0) > 0 ||
      Object.keys(formData.serviceDocuments ?? {}).length > 0 ||
      !!formData.firstName?.trim() ||
      !!formData.lastName?.trim() ||
      !!formData.email?.trim();
    if (!hasProgress) return;
    const totalAmount = calculateTotalAmount(formData, servicesMap, optionsMap, currency);
    await saveSubmission(formData, currentStep, completedSteps, totalAmount);
  }, [formData, currentStep, completedSteps, servicesMap, optionsMap, currency]);

  useEffect(() => {
    initCrisp();
  }, []);

  useEffect(() => {
    const timer = setTimeout(doSave, 2000);
    return () => clearTimeout(timer);
  }, [doSave]);

  // Modal "Need help?" après 15 secondes d'inactivité (une seule fois)
  useEffect(() => {
    if (currentStep === 5 || isContinuing || hasShownInactivityModal || showInactivityModal) return;
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
    setIsContinuing(true);
    try {
      // Track form step completion (Plausible + GTM) before navigating
      const stepData = FORM_STEPS[currentStep - 1];
      if (stepData) {
        trackFormStepPlausible(currentStep, stepData.name);
        trackFormStep(currentStep, stepData.name);
      }
      await doSave();
      await triggerContinue();
    } finally {
      setIsContinuing(false);
    }
  }, [doSave, triggerContinue, currentStep]);

  const prevStep = () => {
    const idx = FORM_STEPS.findIndex((s) => s.path === pathname);
    if (idx > 0) router.push(FORM_STEPS[idx - 1].path);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden overflow-x-hidden w-full max-w-full">
      {/* Header - identique à l'original */}
      <header className="fixed top-0 left-0 right-0 bg-[#F3F4F6] z-50 h-14 sm:h-16 overflow-visible">
        <div className="flex items-center justify-between h-full px-2 sm:px-3 md:px-4 xl:px-6">
          <Link href="/form" className="flex items-center">
            <img src="/logo-noir.svg" alt="My Notary" className="w-[70px] h-[70px] sm:w-[80px] sm:h-[80px]" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 xl:gap-3 overflow-visible">
            <LanguageSelector openDirection="bottom" />
            <CurrencySelector openDirection="bottom" />
            <button
              type="button"
              onClick={() => openCrisp()}
              className="flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-transparent sm:bg-black text-black sm:text-white hover:bg-gray-100 sm:hover:bg-gray-800 transition-colors font-medium text-xs sm:text-sm flex-shrink-0 rounded-lg"
              aria-label="Contact Us"
            >
              <Icon icon="heroicons:chat-bubble-left-right" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 flex-shrink-0" />
              <span className="truncate">Contact Us</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - identique à l'original */}
      <main className="flex-1 flex items-center justify-center pt-14 sm:pt-16 pb-0 overflow-hidden overflow-x-hidden bg-[#F3F4F6] w-full max-w-full">
        <div className="w-full max-w-full h-full animate-fade-in-up flex flex-col overflow-y-auto overflow-x-hidden relative">
          {children}
        </div>
      </main>

      {/* Footer - Progress Bar + Navigation - identique à l'original */}
      <div
        data-footer="notary-form"
        className={`fixed bottom-0 left-0 right-0 bg-white z-50 safe-area-inset-bottom max-w-full overflow-x-hidden ${currentStep === 5 ? "2xl:block hidden" : ""}`}
      >
        {/* Progress Bar */}
        <div className="relative w-full">
          <div className="h-1 bg-gray-300 w-full">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(currentStep / FORM_STEPS.length) * 100}%`,
                background: "linear-gradient(90deg, #491ae9 0%, #b300c7 33%, #f20075 66%, #ff8400 100%)",
              }}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-t border-gray-200 w-full max-w-full overflow-x-hidden">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Back"
            >
              <Icon icon="heroicons:arrow-left" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
          ) : (
            <div />
          )}

          {currentStep < FORM_STEPS.length ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                Step {currentStep}/{FORM_STEPS.length}
              </span>
              <button
                type="button"
                onClick={() => handleContinue()}
                disabled={isContinuing || isUploading}
                className="px-4 sm:px-8 md:px-12 lg:px-16 py-2 sm:py-2.5 font-medium rounded-lg transition-all text-xs sm:text-sm flex-shrink-0 border shadow-lg min-w-0 max-w-full flex items-center justify-center gap-2 bg-[#2563eb] text-white border-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isContinuing ? (
                  <div className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : isUploading ? (
                  <span className="truncate">{t("form.steps.documents.uploading") || "Uploading..."}</span>
                ) : (
                  <>
                    <span className="truncate">Continue</span>
                    <Icon icon="heroicons:arrow-right" className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 2xl:hidden">
              <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                Step {currentStep}/{FORM_STEPS.length}
              </span>
              <button
                type="button"
                onClick={() => handleContinue()}
                disabled={isContinuing || isUploading}
                className="px-4 sm:px-8 md:px-12 lg:px-16 py-2 sm:py-2.5 font-medium rounded-lg transition-all text-xs sm:text-sm flex-shrink-0 border shadow-lg min-w-0 max-w-full flex items-center justify-center gap-2 bg-[#2563eb] text-white border-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isContinuing ? (
                  <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : isUploading ? (
                  <span className="truncate">{t("form.steps.documents.uploading") || "Uploading..."}</span>
                ) : (
                  <>
                    <Icon icon="heroicons:lock-closed" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Secure Payment</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <InactivityModal
        isVisible={showInactivityModal}
        onClose={() => {
          setShowInactivityModal(false);
          setHasShownInactivityModal(true);
          sessionStorage.setItem("inactivityModalShown", "true");
        }}
      />
    </div>
  );
}

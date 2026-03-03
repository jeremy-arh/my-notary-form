"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import LanguageSelector from "./LanguageSelector";
import CurrencySelector from "./CurrencySelector";
import InactivityModal from "./InactivityModal";
import { openCrisp } from "@/lib/utils/crisp";

const FORM_STEPS = [
  { id: 1, path: "/form/personal-info", name: "Your personal informations", icon: "heroicons:user" },
  { id: 2, path: "/form/choose-services", name: "Choose Services", icon: "heroicons:squares-2x2" },
  { id: 3, path: "/form/documents", name: "Upload Documents", icon: "heroicons:document" },
  { id: 4, path: "/form/signatories", name: "Add Signatories", icon: "heroicons:user-group" },
  { id: 5, path: "/form/delivery", name: "Delivery method", icon: "heroicons:truck" },
  { id: 6, path: "/form/summary", name: "Summary", icon: "heroicons:clipboard-document-check" },
];

type FormLayoutContentProps = {
  children: React.ReactNode;
  currentStep: number;
  stepValidation: { isComplete: boolean; errorKey?: string };
  isContinuing: boolean;
  isUploading: boolean;
  showInactivityModal: boolean;
  onPrevStep: () => void;
  onContinue: () => void;
  onCloseInactivityModal: () => void;
  t: (key: string) => string;
};

export default function FormLayoutContent({
  children,
  currentStep,
  stepValidation,
  isContinuing,
  isUploading,
  showInactivityModal,
  onPrevStep,
  onContinue,
  onCloseInactivityModal,
  t,
}: FormLayoutContentProps) {
  return (
    <div className="flex h-screen bg-white overflow-hidden overflow-x-hidden w-full max-w-full">
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

      <main className="flex-1 flex items-center justify-center pt-14 sm:pt-16 pb-0 overflow-hidden overflow-x-hidden bg-[#F3F4F6] w-full max-w-full">
        <div className="w-full max-w-full h-full animate-fade-in-up flex flex-col overflow-y-auto overflow-x-hidden relative">
          {children}
        </div>
      </main>

      <div
        data-footer="notary-form"
        className={`fixed bottom-0 left-0 right-0 bg-white z-50 safe-area-inset-bottom max-w-full overflow-x-hidden ${currentStep === 6 ? "2xl:block hidden" : ""}`}
      >
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

        <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 border-t border-gray-200 w-full max-w-full overflow-x-hidden">
          <div className="flex items-center justify-between w-full">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={onPrevStep}
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
                  onClick={onContinue}
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
                  onClick={onContinue}
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
      </div>

      <InactivityModal isVisible={showInactivityModal} onClose={onCloseInactivityModal} />
    </div>
  );
}

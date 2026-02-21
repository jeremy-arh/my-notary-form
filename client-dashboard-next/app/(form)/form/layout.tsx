"use client";

import { Suspense, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { initialFormData, type FormData } from "@/lib/formData";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ServicesProvider } from "@/contexts/ServicesContext";
import { FormProvider } from "@/contexts/FormContext";
import { FormActionsProvider } from "@/contexts/FormActionsContext";
import FormLayoutClient from "@/components/form/FormLayoutClient";
import FormResumeGuard from "@/components/form/FormResumeGuard";
import AuthPreFill from "@/components/form/AuthPreFill";
import UrlParamsHandler from "@/components/form/UrlParamsHandler";

export default function FormLayout({ children }: { children: React.ReactNode }) {
  const [formData, setFormData, isLoaded] = useLocalStorage<FormData>("notaryFormData", initialFormData);

  const updateFormData = useCallback((updates: Partial<FormData> | ((prev: FormData) => Partial<FormData>)) => {
    setFormData((prev) => {
      const resolved = typeof updates === "function" ? updates(prev) : updates;
      return { ...prev, ...resolved };
    });
  }, [setFormData]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#491ae9] border-t-transparent" />
      </div>
    );
  }

  return (
    <LanguageProvider>
      <CurrencyProvider>
        <ServicesProvider>
          <FormProvider formData={formData} updateFormData={updateFormData}>
            <FormActionsProvider>
              <Suspense fallback={null}>
                <UrlParamsHandler />
                <FormResumeGuard />
              </Suspense>
              <AuthPreFill />
              <FormLayoutClient>{children}</FormLayoutClient>
            </FormActionsProvider>
          </FormProvider>
        </ServicesProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}

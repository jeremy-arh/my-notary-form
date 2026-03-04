"use client";

import { Suspense, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
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

"use client";

import { createContext, useContext } from "react";
import type { FormData } from "@/lib/formData";

const FormContext = createContext<{
  formData: FormData;
  updateFormData: (updates: Partial<FormData> | ((prev: FormData) => Partial<FormData>)) => void;
} | null>(null);

export const useFormData = () => {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error("useFormData must be used within FormProvider");
  return ctx;
};

export function FormProvider({
  children,
  formData,
  updateFormData,
}: {
  children: React.ReactNode;
  formData: FormData;
  updateFormData: (updates: Partial<FormData> | ((prev: FormData) => Partial<FormData>)) => void;
}) {
  return (
    <FormContext.Provider value={{ formData, updateFormData }}>
      {children}
    </FormContext.Provider>
  );
}

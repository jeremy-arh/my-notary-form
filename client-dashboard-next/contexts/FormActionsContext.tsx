"use client";

import { createContext, useContext, useRef, useCallback, useState } from "react";

type ContinueHandler = () => void | Promise<void>;

export type StepValidationResult = { isComplete: boolean; errorKey: string };

const FormActionsContext = createContext<{
  registerContinueHandler: (handler: ContinueHandler) => void;
  triggerContinue: () => Promise<void>;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
  registerStepValidationOverride: (path: string, validator: () => StepValidationResult) => void;
  getStepValidationOverride: (path: string) => (() => StepValidationResult) | null;
} | null>(null);

export const useFormActions = () => {
  const ctx = useContext(FormActionsContext);
  if (!ctx) throw new Error("useFormActions must be used within FormActionsProvider");
  return ctx;
};

export function FormActionsProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<ContinueHandler | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const overrideRef = useRef<Map<string, () => StepValidationResult>>(new Map());

  const registerContinueHandler = useCallback((h: ContinueHandler) => {
    handlerRef.current = h;
  }, []);

  const triggerContinue = useCallback(async () => {
    if (handlerRef.current) await handlerRef.current();
  }, []);

  const registerStepValidationOverride = useCallback((path: string, validator: () => StepValidationResult) => {
    overrideRef.current.set(path, validator);
    return () => overrideRef.current.delete(path);
  }, []);

  const getStepValidationOverride = useCallback((path: string) => {
    return overrideRef.current.get(path) ?? null;
  }, []);

  return (
    <FormActionsContext.Provider
      value={{
        registerContinueHandler,
        triggerContinue,
        isUploading,
        setIsUploading,
        registerStepValidationOverride,
        getStepValidationOverride,
      }}
    >
      {children}
    </FormActionsContext.Provider>
  );
}

"use client";

import { createContext, useContext, useRef, useCallback, useState } from "react";

type ContinueHandler = () => void | Promise<void>;

const FormActionsContext = createContext<{
  registerContinueHandler: (handler: ContinueHandler) => void;
  triggerContinue: () => Promise<void>;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
} | null>(null);

export const useFormActions = () => {
  const ctx = useContext(FormActionsContext);
  if (!ctx) throw new Error("useFormActions must be used within FormActionsProvider");
  return ctx;
};

export function FormActionsProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<ContinueHandler | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const registerContinueHandler = useCallback((h: ContinueHandler) => {
    handlerRef.current = h;
  }, []);

  const triggerContinue = useCallback(async () => {
    if (handlerRef.current) await handlerRef.current();
  }, []);

  return (
    <FormActionsContext.Provider value={{ registerContinueHandler, triggerContinue, isUploading, setIsUploading }}>
      {children}
    </FormActionsContext.Provider>
  );
}

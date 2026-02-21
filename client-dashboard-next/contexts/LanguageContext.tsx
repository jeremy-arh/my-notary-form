"use client";

import { createContext, useContext, useState, useEffect } from "react";

const SUPPORTED_LANGUAGES = ["en", "fr", "es", "de", "it", "pt"] as const;
const DEFAULT_LANGUAGE = "en";
const LANGUAGE_STORAGE_KEY = "user_language";

type Language = (typeof SUPPORTED_LANGUAGES)[number];

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  supportedLanguages: readonly string[];
} | null>(null);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always use DEFAULT_LANGUAGE for SSR/first render to avoid hydration mismatch
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES.includes(saved as Language)) {
        setLanguageState(saved as Language);
        return;
      }
      const browserLang = navigator.language.split("-")[0].toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(browserLang as Language)) {
        setLanguageState(browserLang as Language);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (newLanguage: Language) => {
    if (!SUPPORTED_LANGUAGES.includes(newLanguage)) return;
    setLanguageState(newLanguage);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

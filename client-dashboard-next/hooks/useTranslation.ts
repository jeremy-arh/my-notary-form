"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string, fallback?: string): string => {
    const langTranslations = translations[language] || translations.en;
    return langTranslations[key] || translations.en?.[key] || fallback || key;
  };

  return { t, language };
}

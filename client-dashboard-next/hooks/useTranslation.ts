"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string, paramsOrFallback?: string | Record<string, string>): string => {
    const langTranslations = translations[language] || translations.en;
    let result = langTranslations[key] || translations.en?.[key] || (typeof paramsOrFallback === "string" ? paramsOrFallback : null) || key;
    if (paramsOrFallback && typeof paramsOrFallback === "object") {
      Object.entries(paramsOrFallback).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      });
    }
    return result;
  };

  return { t, language };
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon } from "@iconify/react";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
};

const LANGUAGE_COUNTRIES: Record<string, string> = {
  en: "gb",
  fr: "fr",
  es: "es",
  de: "de",
  it: "it",
  pt: "pt",
};

const getFlagUrl = (lang: string) => {
  const countryCode = LANGUAGE_COUNTRIES[lang] || "gb";
  return `https://flagcdn.com/w20/${countryCode}.png`;
};

export default function LanguageSelector({ openDirection = "bottom" }: { openDirection?: "top" | "bottom" }) {
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <img
          src={getFlagUrl(language)}
          alt={`Flag of ${LANGUAGE_NAMES[language] || language}`}
          className="w-5 h-4 object-cover rounded"
        />
        <Icon icon="heroicons:chevron-down" className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${
            openDirection === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } w-44 bg-white rounded-lg shadow-lg py-1 z-[200] max-h-96 overflow-y-auto`}
        >
          {supportedLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang as "en" | "fr" | "es" | "de" | "it" | "pt")}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                language === lang ? "bg-gray-50 font-semibold" : ""
              }`}
            >
              <img src={getFlagUrl(lang)} alt="" className="w-5 h-4 object-cover rounded" />
              <span>{LANGUAGE_NAMES[lang]}</span>
              {language === lang && <Icon icon="heroicons:check" className="w-4 h-4 ml-auto text-gray-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

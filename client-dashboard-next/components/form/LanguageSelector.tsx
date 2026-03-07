"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
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
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideDropdown = dropdownRef.current?.contains(target);
      const insideModal = modalRef.current?.contains(target);
      if (!insideDropdown && !insideModal) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const listContent = (
    <>
      {supportedLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => {
            setLanguage(lang as "en" | "fr" | "es" | "de" | "it" | "pt");
            setIsOpen(false);
          }}
          className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 ${
            language === lang ? "bg-gray-50 font-semibold" : ""
          }`}
        >
          <img src={getFlagUrl(lang)} alt="" className="w-5 h-4 object-cover rounded shrink-0" />
          <span>{LANGUAGE_NAMES[lang]}</span>
          {language === lang && <Icon icon="heroicons:check" className="w-4 h-4 ml-auto text-gray-600 shrink-0" />}
        </button>
      ))}
    </>
  );

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
        <>
          {/* Mobile: full-screen modal */}
          {typeof document !== "undefined" &&
            createPortal(
              <div
                ref={(el) => { modalRef.current = el; }}
                className="fixed inset-0 z-[9999] flex flex-col bg-white sm:hidden"
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 shrink-0">
                  <h2 className="text-base font-semibold text-gray-900">{t("selector.language")}</h2>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 -m-2 text-gray-600 hover:text-gray-900"
                    aria-label="Close"
                  >
                    <Icon icon="heroicons:x-mark" className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">{listContent}</div>
              </div>,
              document.body
            )}
          {/* Desktop: dropdown */}
          <div
            className={`hidden sm:block absolute left-1/2 -translate-x-1/2 ${
              openDirection === "top" ? "bottom-full mb-2" : "top-full mt-2"
            } w-44 bg-white rounded-lg shadow-lg py-1 z-[200] max-h-96 overflow-y-auto`}
          >
            {listContent}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFormData } from "@/contexts/FormContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@iconify/react";

const CURRENCIES = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "JPY", symbol: "¥" },
  { code: "CHF", symbol: "CHF" },
  { code: "CNY", symbol: "¥" },
];

export default function CurrencySelector({ openDirection = "bottom" }: { openDirection?: "top" | "bottom" }) {
  const { currency, setCurrency } = useCurrency();
  const { updateFormData } = useFormData();
  const { t } = useTranslation();
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

  const hasSyncedInitial = useRef(false);

  useEffect(() => {
    if (!hasSyncedInitial.current) {
      hasSyncedInitial.current = true;
      return;
    }
    updateFormData({ currency });
  }, [currency]);

  const listContent = (
    <>
      {CURRENCIES.map((curr) => (
        <button
          key={curr.code}
          onClick={() => {
            setCurrency(curr.code as "EUR" | "USD" | "GBP" | "CAD" | "AUD" | "CHF" | "JPY" | "CNY");
            setIsOpen(false);
          }}
          className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 ${
            currency === curr.code ? "bg-gray-50 font-semibold" : ""
          }`}
        >
          <span className="text-lg shrink-0">{curr.symbol}</span>
          <span>{curr.code}</span>
          {currency === curr.code && <Icon icon="heroicons:check" className="w-4 h-4 ml-auto text-gray-600 shrink-0" />}
        </button>
      ))}
    </>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
        aria-label="Select currency"
        aria-expanded={isOpen}
      >
        <Icon icon="formkit:multicurrency" className="w-4 h-4" />
        <Icon icon="heroicons:chevron-down" className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <>
          {/* Mobile: full-screen modal */}
          {typeof document !== "undefined" &&
            createPortal(
              <div className="fixed inset-0 z-[9999] flex flex-col bg-white sm:hidden">
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 shrink-0">
                  <h2 className="text-base font-semibold text-gray-900">{t("selector.currency")}</h2>
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

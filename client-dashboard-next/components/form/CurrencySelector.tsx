"use client";

import { useState, useEffect, useRef } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFormData } from "@/contexts/FormContext";
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
    // Skip the very first render — formData.currency is already set from localStorage.
    // Only sync when the user actively changes the currency via the selector.
    if (!hasSyncedInitial.current) {
      hasSyncedInitial.current = true;
      return;
    }
    updateFormData({ currency });
  }, [currency]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
        aria-label="Select currency"
        aria-expanded={isOpen}
      >
        <span className="text-lg">{CURRENCIES.find((c) => c.code === currency)?.symbol || "€"}</span>
        <Icon icon="heroicons:chevron-down" className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${
            openDirection === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } w-44 bg-white rounded-lg shadow-lg py-1 z-[200] max-h-96 overflow-y-auto`}
        >
          {CURRENCIES.map((curr) => (
            <button
              key={curr.code}
              onClick={() => {
                setCurrency(curr.code as "EUR" | "USD" | "GBP" | "CAD" | "AUD" | "CHF" | "JPY" | "CNY");
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                currency === curr.code ? "bg-gray-50 font-semibold" : ""
              }`}
            >
              <span className="text-lg">{curr.symbol}</span>
              <span>{curr.code}</span>
              {currency === curr.code && <Icon icon="heroicons:check" className="w-4 h-4 ml-auto text-gray-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

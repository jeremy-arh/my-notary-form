"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

const USER_CURRENCY_KEY = "user_selected_currency";
const LEGACY_CURRENCY_KEY = "notaryCurrency";
const VALID_CURRENCIES = ["EUR", "USD", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY"] as const;
type Currency = (typeof VALID_CURRENCIES)[number];

const CurrencyContext = createContext<{
  currency: Currency;
  setCurrency: (c: Currency) => void;
  isLoading: boolean;
  formatPrice: (price: number) => string;
} | null>(null);

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};

const formatPriceDirect = (price: number, currency: Currency): string => {
  const symbols: Record<Currency, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    CHF: "CHF",
    JPY: "¥",
    CNY: "¥",
  };
  const symbol = symbols[currency];
  if (currency === "JPY" || currency === "CNY") return `${symbol}${Math.round(price)}`;
  return `${symbol}${price.toFixed(2)}`;
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(USER_CURRENCY_KEY) || localStorage.getItem(LEGACY_CURRENCY_KEY);
    if (saved && VALID_CURRENCIES.includes(saved as Currency)) {
      setCurrencyState(saved as Currency);
      if (!localStorage.getItem(USER_CURRENCY_KEY) && localStorage.getItem(LEGACY_CURRENCY_KEY)) {
        localStorage.setItem(USER_CURRENCY_KEY, saved);
      }
    }
    setIsLoading(false);
  }, []);

  const setCurrency = useCallback((newCurrency: Currency) => {
    if (!VALID_CURRENCIES.includes(newCurrency)) return;
    setCurrencyState(newCurrency);
    localStorage.setItem(USER_CURRENCY_KEY, newCurrency);
    localStorage.setItem(LEGACY_CURRENCY_KEY, newCurrency);
  }, []);

  const formatPrice = useCallback((price: number) => formatPriceDirect(price, currency), [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, isLoading, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

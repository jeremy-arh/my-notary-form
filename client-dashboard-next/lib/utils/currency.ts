/**
 * Currency conversion and formatting utilities
 */

const SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF ",
  JPY: "¥",
  CNY: "¥",
};

const FALLBACK_RATES: Record<string, number> = {
  USD: 1.1,
  GBP: 0.85,
  CAD: 1.5,
  AUD: 1.65,
  CHF: 0.95,
  JPY: 165,
  CNY: 7.8,
};

export function convertPriceSync(eurAmount: number, targetCurrency: string): number {
  if (!eurAmount || !targetCurrency || targetCurrency === "EUR") return eurAmount;
  const rate = FALLBACK_RATES[targetCurrency] ?? 1;
  return Math.round(eurAmount * rate * 100) / 100;
}

export function formatPriceSync(amount: number, targetCurrency: string): string {
  const symbol = SYMBOLS[targetCurrency] ?? targetCurrency;
  if (targetCurrency === "JPY" || targetCurrency === "CNY") {
    return `${symbol}${Math.round(amount)}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

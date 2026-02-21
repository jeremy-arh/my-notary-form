/**
 * Pricing utilities - services, options, delivery
 */

import { convertPriceSync } from "./currency";

const DELIVERY_POSTAL_PRICE_EUR = 29.95;

export type ServiceRecord = {
  service_id: string;
  base_price?: number;
  price_usd?: number;
  price_gbp?: number;
  icon?: string;
  color?: string;
  name?: string;
  [key: string]: unknown;
};

export type OptionRecord = {
  option_id: string;
  additional_price?: number;
  price_usd?: number;
  price_gbp?: number;
  name?: string;
  description?: string;
  [key: string]: unknown;
};

export function getServicePrice(service: ServiceRecord | null, currency: string): number {
  if (!service) return 0;
  if (currency === "USD" && service.price_usd != null) return service.price_usd;
  if (currency === "GBP" && service.price_gbp != null) return service.price_gbp;
  return service.base_price ?? 0;
}

export function getServicePriceCurrency(service: ServiceRecord | null, targetCurrency: string): string {
  if (!service) return "EUR";
  if (targetCurrency === "USD" && service.price_usd != null) return "USD";
  if (targetCurrency === "GBP" && service.price_gbp != null) return "GBP";
  return "EUR";
}

export function getOptionPrice(option: OptionRecord | null, currency: string): number {
  if (!option) return 0;
  if (currency === "USD" && option.price_usd != null) return option.price_usd;
  if (currency === "GBP" && option.price_gbp != null) return option.price_gbp;
  return option.additional_price ?? 0;
}

export function getOptionPriceCurrency(option: OptionRecord | null, targetCurrency: string): string {
  if (!option) return "EUR";
  if (targetCurrency === "USD" && option.price_usd != null) return "USD";
  if (targetCurrency === "GBP" && option.price_gbp != null) return "GBP";
  return "EUR";
}

/**
 * Retourne le prix du service converti dans la devise cible.
 * Si la devise cible a un prix en DB (USD, GBP), l'utilise ; sinon convertit depuis EUR.
 */
export function getServicePriceInCurrency(service: ServiceRecord | null, targetCurrency: string): number {
  if (!service) return 0;
  const price = getServicePrice(service, targetCurrency);
  const priceCur = getServicePriceCurrency(service, targetCurrency);
  return priceCur === targetCurrency ? price : convertPriceSync(price, targetCurrency);
}

/**
 * Retourne le prix de l'option converti dans la devise cible.
 * Si la devise cible a un prix en DB (USD, GBP), l'utilise ; sinon convertit depuis EUR.
 */
export function getOptionPriceInCurrency(option: OptionRecord | null, targetCurrency: string): number {
  if (!option) return 0;
  const price = getOptionPrice(option, targetCurrency);
  const priceCur = getOptionPriceCurrency(option, targetCurrency);
  return priceCur === targetCurrency ? price : convertPriceSync(price, targetCurrency);
}

export { DELIVERY_POSTAL_PRICE_EUR };

/** Calcule le total en devise cible (pour save submission) */
export function calculateTotalAmount(
  formData: { selectedServices?: string[]; serviceDocuments?: Record<string, unknown[]>; deliveryMethod?: string | null },
  servicesMap: Record<string, ServiceRecord>,
  optionsMap: Record<string, OptionRecord>,
  currency: string
): number {
  let total = 0;
  (formData.selectedServices ?? []).forEach((sid) => {
    const service = servicesMap[sid];
    const docs = (formData.serviceDocuments?.[sid] ?? []) as { selectedOptions?: string[] }[];
    if (service) {
      const sp = getServicePrice(service, currency);
      const spCur = getServicePriceCurrency(service, currency);
      const spInCur = spCur === currency ? sp : convertPriceSync(sp, currency);
      total += docs.length * spInCur;
      docs.forEach((doc) => {
        (doc.selectedOptions ?? []).forEach((optId) => {
          const opt = optionsMap[optId];
          if (opt) {
            const op = getOptionPrice(opt, currency);
            const opCur = getOptionPriceCurrency(opt, currency);
            const opInCur = opCur === currency ? op : convertPriceSync(op, currency);
            total += opInCur;
          }
        });
      });
    }
  });
  if (formData.deliveryMethod === "postal") {
    total += currency === "EUR" ? DELIVERY_POSTAL_PRICE_EUR : convertPriceSync(DELIVERY_POSTAL_PRICE_EUR, currency);
  }
  return total;
}

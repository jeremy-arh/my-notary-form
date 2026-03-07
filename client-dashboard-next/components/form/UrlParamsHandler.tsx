"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useFormData } from "@/contexts/FormContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useServices } from "@/contexts/ServicesContext";
import { saveSubmission } from "@/lib/saveSubmission";

const VALID_CURRENCIES = ["EUR", "USD", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY"] as const;

function normalizeSlug(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

/**
 * Applique les paramètres URL (?currency=GBP&service=certified-translation) au formulaire.
 * - currency: sélectionne la devise
 * - service: pré-sélectionne le service et permet de sauter l'étape choose-services
 */
export default function UrlParamsHandler() {
  const searchParams = useSearchParams();
  const { formData, updateFormData } = useFormData();
  const { setCurrency } = useCurrency();
  const { services, loading: servicesLoading } = useServices();
  const lastAppliedServiceParamRef = useRef<string | null>(null);
  const lastAppliedCurrencyParamRef = useRef<string | null>(null);

  const currencyParam = searchParams.get("currency");
  const serviceParam = searchParams.get("service");
  const gclidParam = searchParams.get("gclid");
  const lastAppliedGclidRef = useRef<string | null>(null);

  // Capturer le GCLID dès l'arrivée sur le formulaire et le sauvegarder immédiatement
  useEffect(() => {
    if (!gclidParam?.trim() || lastAppliedGclidRef.current === gclidParam) return;
    if (formData.gclid === gclidParam) return;

    lastAppliedGclidRef.current = gclidParam;
    updateFormData({ gclid: gclidParam });

    saveSubmission(
      { ...formData, gclid: gclidParam },
      1,
      [],
      null,
      { createAccount: false }
    ).catch(() => {});
  }, [gclidParam, formData, updateFormData]);

  // Appliquer la devise depuis l'URL (une seule fois par valeur pour éviter la boucle infinie)
  useEffect(() => {
    if (!currencyParam) return;
    const normalized = currencyParam.toUpperCase();
    if (!VALID_CURRENCIES.includes(normalized as (typeof VALID_CURRENCIES)[number])) return;
    if (lastAppliedCurrencyParamRef.current === normalized) return;

    lastAppliedCurrencyParamRef.current = normalized;
    setCurrency(normalized as (typeof VALID_CURRENCIES)[number]);
    updateFormData({ currency: normalized });
  }, [currencyParam, setCurrency, updateFormData]);

  // Appliquer le service depuis l'URL (comme l'ancienne version)
  useEffect(() => {
    if (!serviceParam || servicesLoading || !services?.length) return;
    if (lastAppliedServiceParamRef.current === serviceParam) return;

    const requestedSlugs = serviceParam
      .split(",")
      .map(normalizeSlug)
      .filter(Boolean);

    if (requestedSlugs.length === 0) {
      lastAppliedServiceParamRef.current = serviceParam;
      return;
    }

    const exactMatches: string[] = [];
    const partialMatches: string[] = [];

    services.forEach((service) => {
      const candidates = [
        service.slug,
        service.code,
        service.key,
        service.url_key,
        service.name,
        service.service_id,
      ]
        .filter(Boolean)
        .map((v) => normalizeSlug(String(v)));

      const exactMatch = requestedSlugs.some((slug) => candidates.includes(slug));
      if (exactMatch) {
        exactMatches.push(service.service_id);
        return;
      }

      const partialMatch = requestedSlugs.some((slug) =>
        candidates.some(
          (c) => c === slug || c.startsWith(slug + "-")
        )
      );
      if (partialMatch) partialMatches.push(service.service_id);
    });

    const matchedIds = Array.from(
      new Set(exactMatches.length > 0 ? exactMatches : partialMatches)
    );

    if (matchedIds.length === 0) {
      lastAppliedServiceParamRef.current = serviceParam;
      return;
    }

    const servicesToApply = matchedIds.length > 1 ? [matchedIds[0]] : matchedIds;

    updateFormData((prev) => ({
      ...prev,
      selectedServices: servicesToApply,
      serviceDocuments: {},
    }));

    lastAppliedServiceParamRef.current = serviceParam;
  }, [serviceParam, services, servicesLoading, updateFormData]);

  return null;
}

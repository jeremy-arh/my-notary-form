"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useServices } from "@/contexts/ServicesContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { initCrisp, openCrisp } from "@/lib/utils/crisp";
import { getServicePriceInCurrency } from "@/lib/utils/pricing";
import { formatPriceSync } from "@/lib/utils/currency";
import { Skeleton } from "@/components/ui/skeleton";

function normalizeForSearch(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function NoResultsContactBlock({
  message,
  t,
}: {
  message: string;
  t: (k: string) => string;
}) {
  const handleContactClick = () => {
    initCrisp();
    openCrisp();
  };

  return (
    <div className="text-center py-8 sm:py-12">
      <div className="mb-5 flex items-center justify-center" role="img" aria-label="Notre équipe">
        <div className="relative z-0 h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full border-[3px] border-gray-200 shadow-md">
          <img
            src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/fdd2c406-8968-42ec-8ebd-21efcd575d00/public"
            alt=""
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="relative z-10 -ml-5 h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full border-[3px] border-gray-200 shadow-md">
          <img
            src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/36b5466f-9dee-4b88-ac69-83859843f900/public?f=webp,q=80"
            alt=""
            className="h-full w-full object-cover object-center"
          />
        </div>
      </div>
      <p className="mb-4 text-sm sm:text-base text-gray-600">{message}</p>
      <p className="mb-4 text-sm text-gray-600">
        {t("form.steps.chooseOption.noResultsContact") ||
          "You didn't find what you're looking for? Contact us and we'll help you find the right service."}
      </p>
      <button
        type="button"
        onClick={handleContactClick}
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-3 font-semibold text-white transition-all duration-200 hover:bg-[#1d4ed8] active:bg-[#1e40af]"
      >
        <Icon icon="heroicons:chat-bubble-left-right" className="h-5 w-5" />
        <span>{t("form.steps.chooseOption.contactUs") || "Contact Us"}</span>
      </button>
    </div>
  );
}

function fuzzyMatch(text: string, query: string): boolean {
  const nText = normalizeForSearch(text);
  const nQuery = normalizeForSearch(query);
  if (nText.includes(nQuery)) return true;
  if (nQuery.length <= 2) return nText.includes(nQuery);
  const maxDist = nQuery.length <= 4 ? 1 : Math.ceil(nQuery.length / 3);
  for (let len = nQuery.length - 1; len <= nQuery.length + 2; len++) {
    for (let i = 0; i <= nText.length - len; i++) {
      const sub = nText.slice(i, i + len);
      if (levenshtein(nQuery, sub) <= maxDist) return true;
    }
  }
  let idx = 0;
  for (const c of nQuery) {
    idx = nText.indexOf(c, idx);
    if (idx === -1) return false;
    idx++;
  }
  return true;
}

export default function ChooseServicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { registerContinueHandler } = useFormActions();
  const { services, loading, getServiceName } = useServices();
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const toggleService = useCallback(
    (serviceId: string) => {
      const doUpdate = () => {
        const current = formData.selectedServices ?? [];
        const isAdding = !current.includes(serviceId);
        const updated = isAdding ? [...current, serviceId] : current.filter((id) => id !== serviceId);

        let updatedDocs = { ...(formData.serviceDocuments ?? {}) };
        if (!isAdding && updatedDocs[serviceId]) {
          const { [serviceId]: _, ...rest } = updatedDocs;
          updatedDocs = rest;
        }

        updateFormData({ selectedServices: updated, serviceDocuments: updatedDocs });
      };

      if (typeof document !== "undefined" && "startViewTransition" in document) {
        (document as Document & { startViewTransition: (cb: () => void) => Promise<{ finished: Promise<void> }> }).startViewTransition(doUpdate);
      } else {
        doUpdate();
      }
    },
    [formData.selectedServices, formData.serviceDocuments, updateFormData]
  );

  const handleNext = useCallback(() => {
    if ((formData.selectedServices ?? []).length === 0) {
      toast.error(t("form.steps.chooseOption.selectOne"));
      return;
    }
    router.push("/form/documents");
  }, [formData.selectedServices, router, t]);

  useEffect(() => {
    registerContinueHandler(handleNext);
  }, [registerContinueHandler, handleNext]);

  const filteredAndSortedServices = useMemo(() => {
    const q = searchQuery.trim();
    let list = services;
    if (q) {
      list = services.filter((s) => fuzzyMatch(getServiceName(s), q));
    }
    const selected = formData.selectedServices ?? [];
    return [...list].sort((a, b) => {
      const aSel = selected.includes(a.service_id);
      const bSel = selected.includes(b.service_id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [services, searchQuery, formData.selectedServices, getServiceName]);

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-28 sm:pb-32 md:pb-28 lg:pb-28"
      style={{ minHeight: 0 }}
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
            {t("form.steps.chooseOption.title")}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{t("form.steps.chooseOption.subtitle")}</p>
          <div className="relative">
            <Icon
              icon="heroicons:magnifying-glass"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("form.steps.chooseOption.searchPlaceholder") || "Search services..."}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400"
              aria-label={t("form.steps.chooseOption.searchPlaceholder") || "Search services"}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <Icon icon="heroicons:x-mark" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-2.5 sm:p-3 md:p-3.5 rounded-lg sm:rounded-xl border-2 border-gray-200 bg-white">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <NoResultsContactBlock
            message={t("form.steps.chooseOption.noServices")}
            t={t}
          />
        ) : filteredAndSortedServices.length === 0 ? (
          <NoResultsContactBlock
            message={t("form.steps.chooseOption.noResults") || "No services match your search."}
            t={t}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {filteredAndSortedServices.map((service) => {
              const isSelected = formData.selectedServices?.includes(service.service_id);
              const price = getServicePriceInCurrency(service, currency);
              return (
                <button
                  key={service.service_id}
                  type="button"
                  onClick={() => toggleService(service.service_id)}
                  className={`text-left p-2.5 sm:p-3 md:p-3.5 rounded-lg sm:rounded-xl border-2 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] ${
                    isSelected
                      ? "border-black bg-white shadow-lg"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${service.color ?? "bg-gray-100"}`}
                    >
                      <Icon
                        icon={(service.icon as string) ?? "heroicons:document-text"}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base text-gray-900 break-words">
                          {getServiceName(service)}
                        </h3>
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5">
                          {formatPriceSync(price, currency)}{" "}
                          {t("form.steps.documents.perDocument")}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center flex-shrink-0">
                          <Icon
                            icon="stash:check-light"
                            className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

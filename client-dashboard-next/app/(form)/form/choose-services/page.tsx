"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useServices } from "@/contexts/ServicesContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { getServicePriceInCurrency } from "@/lib/utils/pricing";
import { formatPriceSync } from "@/lib/utils/currency";

export default function ChooseServicesPage() {
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { registerContinueHandler } = useFormActions();
  const { services, loading, getServiceName } = useServices();
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const toggleService = useCallback(
    (serviceId: string) => {
      const current = formData.selectedServices ?? [];
      const isAdding = !current.includes(serviceId);
      const updated = isAdding ? [...current, serviceId] : current.filter((id) => id !== serviceId);

      let updatedDocs = { ...(formData.serviceDocuments ?? {}) };
      if (!isAdding && updatedDocs[serviceId]) {
        const { [serviceId]: _, ...rest } = updatedDocs;
        updatedDocs = rest;
      }

      updateFormData({ selectedServices: updated, serviceDocuments: updatedDocs });
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

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-36 md:pb-6 lg:pb-6"
      style={{ minHeight: 0 }}
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
            {t("form.steps.chooseOption.title")}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">{t("form.steps.chooseOption.subtitle")}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12 md:py-16">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 border-b-2 border-black" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-8 sm:py-12 md:py-16">
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              {t("form.steps.chooseOption.noServices")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {services.map((service) => {
              const isSelected = formData.selectedServices?.includes(service.service_id);
              const price = getServicePriceInCurrency(service, currency);
              return (
                <button
                  key={service.service_id}
                  type="button"
                  onClick={() => toggleService(service.service_id)}
                  className={`text-left p-2.5 sm:p-3 md:p-3.5 rounded-lg sm:rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
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

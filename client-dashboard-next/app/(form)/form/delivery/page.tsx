"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DELIVERY_POSTAL_PRICE_EUR } from "@/lib/utils/pricing";
import { formatPriceSync } from "@/lib/utils/currency";
import { convertPriceSync } from "@/lib/utils/currency";

export default function DeliveryPage() {
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { registerContinueHandler } = useFormActions();
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const deliveryMethod = formData.deliveryMethod ?? null;

  // Toujours calculer le prix converti pour l'affichage de l'option postale
  const convertedPrice =
    currency === "EUR"
      ? formatPriceSync(DELIVERY_POSTAL_PRICE_EUR, "EUR")
      : formatPriceSync(convertPriceSync(DELIVERY_POSTAL_PRICE_EUR, currency), currency);

  const handleSelect = useCallback(
    (method: string) => {
      updateFormData({ deliveryMethod: method });
    },
    [updateFormData]
  );

  const getDeliveryDescription = useCallback(() => {
    const desc = t("form.steps.delivery.postDescription");
    if (convertedPrice) {
      return desc.replace(/€?\s*\d+[.,]\d+\s*€?/gi, `${convertedPrice} `).replace(/\s+/g, " ").trim();
    }
    return desc;
  }, [convertedPrice, t]);

  const handleNext = useCallback(() => {
    if (!deliveryMethod) {
      toast.error(t("form.steps.summary.missingDelivery"));
      return;
    }
    router.push("/form/summary");
  }, [deliveryMethod, router, t]);

  useEffect(() => {
    registerContinueHandler(handleNext);
  }, [registerContinueHandler, handleNext]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
            {t("form.steps.delivery.title")}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">{t("form.steps.delivery.subtitle")}</p>
        </div>
      </div>

      <div
        className="flex-1 px-3 sm:px-4 md:px-6 pb-32 sm:pb-36 md:pb-6 lg:pb-24 overflow-y-auto overflow-x-hidden"
        style={{ minHeight: 0 }}
      >
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          <button
            type="button"
            onClick={() => handleSelect("postal")}
            className={`w-full text-left bg-white rounded-xl sm:rounded-2xl border transition-all flex items-stretch overflow-hidden ${
              deliveryMethod === "postal"
                ? "border-black shadow-lg"
                : "border-gray-200 hover:border-gray-300 hover:shadow-md"
            }`}
          >
            <div className="flex items-center p-4 sm:p-5 flex-1">
              <div className="mr-4 sm:mr-5 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-gray-200 flex items-center justify-center bg-gray-50">
                  <Icon icon="heroicons:envelope" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {t("form.steps.delivery.postTitle")}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">{getDeliveryDescription()}</p>
              </div>
              <div className="ml-3 sm:ml-4 flex items-center">
                <div
                  className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                    deliveryMethod === "postal" ? "border-blue-600 bg-blue-600" : "border-blue-300 bg-white"
                  }`}
                >
                  {deliveryMethod === "postal" && (
                    <Icon icon="heroicons:check" className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelect("email")}
            className={`w-full text-left bg-white rounded-xl sm:rounded-2xl border transition-all flex items-stretch overflow-hidden ${
              deliveryMethod === "email"
                ? "border-black shadow-lg"
                : "border-gray-200 hover:border-gray-300 hover:shadow-md"
            }`}
          >
            <div className="flex items-center p-4 sm:p-5 flex-1">
              <div className="mr-4 sm:mr-5 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-gray-200 flex items-center justify-center bg-gray-50">
                  <span className="text-lg sm:text-xl font-semibold text-gray-700">@</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {t("form.steps.delivery.emailTitle")}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  {t("form.steps.delivery.emailDescription")}
                </p>
              </div>
              <div className="ml-3 sm:ml-4 flex items-center">
                <div
                  className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                    deliveryMethod === "email" ? "border-blue-600 bg-blue-600" : "border-blue-300 bg-white"
                  }`}
                >
                  {deliveryMethod === "email" && (
                    <Icon icon="heroicons:check" className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>
            </div>
          </button>

          <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-3">
            <Icon icon="heroicons:information-circle" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-blue-900 flex-1">
              {t("form.steps.delivery.personalSpaceInfo")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

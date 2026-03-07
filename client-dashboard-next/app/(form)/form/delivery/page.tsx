"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DELIVERY_OPTIONS, type DeliveryOptionKey } from "@/lib/utils/pricing";
import { formatPriceSync, convertPriceSync } from "@/lib/utils/currency";
import DeliveryAddressModal from "@/components/form/DeliveryAddressModal";

export default function DeliveryPage() {
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { registerContinueHandler } = useFormActions();
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const [showPostalModal, setShowPostalModal] = useState(false);

  const deliveryMethod = formData.deliveryMethod ?? null;
  const deliveryOption = (formData.deliveryOption as DeliveryOptionKey) ?? null;

  const formatDeliveryPrice = useCallback(
    (eurPrice: number) => {
      const amount =
        currency === "EUR"
          ? eurPrice
          : convertPriceSync(eurPrice, currency);
      return formatPriceSync(amount, currency);
    },
    [currency]
  );

  const priceRange = `${formatDeliveryPrice(DELIVERY_OPTIONS.standard.priceEUR)} - ${formatDeliveryPrice(DELIVERY_OPTIONS.express.priceEUR)}`;

  const handlePostalClick = useCallback(() => {
    setShowPostalModal(true);
  }, []);

  const handlePostalConfirm = useCallback(
    (data: {
      deliveryAddress: string;
      deliveryCity: string;
      deliveryPostalCode: string;
      deliveryCountry: string;
      deliveryOption: DeliveryOptionKey;
      deliveryPriceEUR: number;
      deliveryCarrier?: string;
      usePersonalAddressForDelivery: boolean;
    }) => {
      updateFormData({
        deliveryMethod: "postal",
        ...data,
      });
      setShowPostalModal(false);
    },
    [updateFormData]
  );

  const handleEmailSelect = useCallback(() => {
    updateFormData({
      deliveryMethod: "email",
      deliveryOption: null,
      deliveryPriceEUR: undefined,
      deliveryAddress: undefined,
      deliveryCity: undefined,
      deliveryPostalCode: undefined,
      deliveryCountry: undefined,
      usePersonalAddressForDelivery: undefined,
    });
  }, [updateFormData]);

  const handleNext = useCallback(() => {
    if (!deliveryMethod) {
      toast.error(t("form.steps.summary.missingDelivery"));
      return;
    }
    if (deliveryMethod === "postal" && !deliveryOption) {
      toast.error(t("form.delivery.modal.errorOption"));
      return;
    }
    router.push("/form/summary");
  }, [deliveryMethod, deliveryOption, router, t]);

  useEffect(() => {
    registerContinueHandler(handleNext);
  }, [registerContinueHandler, handleNext]);

  const postalConfigured = deliveryMethod === "postal" && deliveryOption;
  const deliveryAddress = [formData.deliveryAddress, formData.deliveryCity, formData.deliveryPostalCode, formData.deliveryCountry]
    .filter(Boolean)
    .join(", ");

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
        className="flex-1 px-3 sm:px-4 md:px-6 pb-28 sm:pb-32 md:pb-28 lg:pb-28 overflow-y-auto overflow-x-hidden"
        style={{ minHeight: 0 }}
      >
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {/* Postal option */}
          <div
            className={`w-full text-left bg-white rounded-xl sm:rounded-2xl border transition-all overflow-hidden ${
              deliveryMethod === "postal"
                ? "border-black shadow-lg"
                : "border-gray-200 hover:border-gray-300 hover:shadow-md"
            }`}
          >
            <button
              type="button"
              onClick={handlePostalClick}
              className="w-full flex items-center p-4 sm:p-5"
            >
              <div className="mr-4 sm:mr-5 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-gray-200 flex items-center justify-center bg-gray-50">
                  <Icon icon="heroicons:envelope" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
                </div>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {t("form.steps.delivery.postTitle")}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  {t("form.steps.delivery.postDescriptionRange", { range: priceRange })}
                </p>
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
            </button>

            {postalConfigured && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
                <div className="pt-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon
                        icon={deliveryOption === "express" ? "heroicons:bolt" : "heroicons:truck"}
                        className="w-4 h-4 text-gray-600"
                      />
                      <span className="text-xs sm:text-sm font-medium text-gray-900">
                        {t(`form.delivery.modal.option.${deliveryOption}.title`)}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900">
                      {formatDeliveryPrice(formData.deliveryPriceEUR!)}
                    </span>
                  </div>
                  {deliveryAddress && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Icon icon="heroicons:map-pin" className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{deliveryAddress}</span>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowPostalModal(true); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                  >
                    {t("form.delivery.modal.modify")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Email option */}
          <button
            type="button"
            onClick={handleEmailSelect}
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

      <DeliveryAddressModal
        open={showPostalModal}
        onClose={() => setShowPostalModal(false)}
        onConfirm={handlePostalConfirm}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useServices } from "@/contexts/ServicesContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "@/hooks/useTranslation";
import Notification from "@/components/form/Notification";
import {
  getServicePriceInCurrency,
  getOptionPriceInCurrency,
  DELIVERY_POSTAL_PRICE_EUR,
} from "@/lib/utils/pricing";
import { formatPriceSync, convertPriceSync } from "@/lib/utils/currency";
import { trackFormSubmissionStart as trackFormSubmissionStartPlausible } from "@/lib/utils/plausible";
import {
  trackFormSubmissionStart,
  trackBeginCheckout,
  trackPaymentFailure,
} from "@/lib/utils/gtm";
import { trackPaymentFailure as trackPaymentFailurePlausible } from "@/lib/utils/plausible";

type DocFile = {
  name: string;
  size: number;
  path?: string;
  url?: string;
  selectedOptions?: string[];
};

type NotificationState = {
  type: "error" | "info";
  message: string;
} | null;

export default function SummaryPage() {
  const router = useRouter();
  const { formData } = useFormData();
  const { registerContinueHandler } = useFormActions();
  const { servicesMap, optionsMap, loading, getServiceName, getOptionName } = useServices();
  const { currency } = useCurrency();
  const { t, language } = useTranslation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPriceDetailsOpen, setIsPriceDetailsOpen] = useState(true);
  const [viewingFile, setViewingFile] = useState<DocFile | null>(null);
  const [notification, setNotification] = useState<NotificationState>(null);
  const [convertedDeliveryPrice, setConvertedDeliveryPrice] = useState("");

  const totalDocuments =
    formData.selectedServices?.reduce((total, sid) => {
      const docs = formData.serviceDocuments?.[sid] as DocFile[] | undefined;
      return total + (docs?.length ?? 0);
    }, 0) ?? 0;

  const isFormComplete =
    (formData.selectedServices?.length ?? 0) > 0 &&
    totalDocuments > 0 &&
    !!formData.firstName?.trim() &&
    !!formData.lastName?.trim() &&
    !!formData.email?.trim() &&
    !!formData.deliveryMethod;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1536);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (formData.deliveryMethod === "postal") {
      const amount =
        currency === "EUR"
          ? DELIVERY_POSTAL_PRICE_EUR
          : convertPriceSync(DELIVERY_POSTAL_PRICE_EUR, currency);
      setConvertedDeliveryPrice(formatPriceSync(amount, currency));
    } else {
      setConvertedDeliveryPrice("");
    }
  }, [formData.deliveryMethod, currency]);

  const getDeliveryDescription = useCallback(() => {
    const description =
      formData.deliveryMethod === "postal"
        ? t("form.steps.delivery.postDescription")
        : t("form.steps.delivery.emailDescription");

    if (formData.deliveryMethod === "postal" && convertedDeliveryPrice) {
      return description
        .replace(/€?\s*\d+[.,]\d+\s*€?/gi, `${convertedDeliveryPrice} `)
        .replace(/\s+/g, " ")
        .trim();
    }
    return description;
  }, [formData.deliveryMethod, convertedDeliveryPrice, t]);

  const getTotalAmount = useCallback(() => {
    let total = 0;
    (formData.selectedServices ?? []).forEach((sid) => {
      const service = servicesMap[sid];
      const docs = (formData.serviceDocuments?.[sid] ?? []) as DocFile[];
      if (service) {
        const spInCur = getServicePriceInCurrency(service, currency);
        total += docs.length * spInCur;
        docs.forEach((doc) => {
          (doc.selectedOptions ?? []).forEach((optId) => {
            const opt = optionsMap[optId];
            if (opt) total += getOptionPriceInCurrency(opt, currency);
          });
        });
      }
    });
    if (formData.deliveryMethod === "postal") {
      total +=
        currency === "EUR"
          ? DELIVERY_POSTAL_PRICE_EUR
          : convertPriceSync(DELIVERY_POSTAL_PRICE_EUR, currency);
    }
    return total;
  }, [formData.selectedServices, formData.serviceDocuments, formData.deliveryMethod, servicesMap, optionsMap, currency]);

  const getMissingInfo = useCallback(() => {
    const missing: { key: string; label: string; action: () => void }[] = [];
    const push = (key: string, label: string, action: () => void) => missing.push({ key, label, action });

    if (!formData.selectedServices?.length) {
      push(
        "services",
        t("form.steps.summary.missingServices") || "Aucun service sélectionné",
        () => router.push("/form/choose-services")
      );
    }
    if (totalDocuments === 0) {
      push(
        "documents",
        t("form.steps.summary.missingDocuments") || "Aucun document uploadé",
        () => router.push("/form/documents")
      );
    }
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim()) {
      const fields: string[] = [];
      if (!formData.firstName?.trim()) fields.push(t("form.steps.personalInfo.firstName") || "Prénom");
      if (!formData.lastName?.trim()) fields.push(t("form.steps.personalInfo.lastName") || "Nom");
      if (!formData.email?.trim()) fields.push(t("form.steps.personalInfo.email") || "Email");
      push(
        "personalInfo",
        `${t("form.steps.summary.missingPersonalInfo") || "Informations personnelles manquantes"}: ${fields.join(", ")}`,
        () => router.push("/form/personal-info")
      );
    }
    if (!formData.deliveryMethod) {
      push(
        "delivery",
        t("form.steps.summary.missingDelivery") || "Méthode de livraison non sélectionnée",
        () => router.push("/form/delivery")
      );
    }
    return missing;
  }, [formData, totalDocuments, t, router]);

  const handlePay = useCallback(async () => {
    const missing = getMissingInfo();

    if (missing.length > 0) {
      const missingLabels = missing.map((item) => `• ${item.label}`).join("\n");
      const title = t("form.steps.summary.missingInfoTitle") || "Informations manquantes";
      setNotification({ type: "error", message: `${title}\n\n${missingLabels}` });
      setTimeout(() => {
        missing[0]?.action();
      }, 2000);
      return;
    }

    setIsSubmitting(true);
    try {
      // Track form submission start + begin checkout (Plausible + GTM)
      trackFormSubmissionStartPlausible(formData);
      trackFormSubmissionStart(formData);
      const totalAmount = getTotalAmount();
      trackBeginCheckout({
        currency,
        value: totalAmount,
        amount: totalAmount,
        items: (formData.selectedServices ?? []).flatMap((sid) => {
          const service = servicesMap[sid];
          const docs = (formData.serviceDocuments?.[sid] ?? []) as DocFile[];
          if (!service || docs.length === 0) return [];
          const name = getServiceName(service) || sid;
          return docs.map(() => ({
            item_id: sid,
            item_name: name,
            price: getServicePriceInCurrency(service, currency),
            quantity: 1,
          }));
        }),
      });

      const sessionId =
        typeof window !== "undefined" ? localStorage.getItem("formSessionId") : null;

      const localizedNames: Record<string, string> = {};
      const localizedLineItems: { type: string; id: string; name: string; quantity: number }[] = [];

      (formData.selectedServices ?? []).forEach((sid) => {
        const service = servicesMap[sid];
        const docs = (formData.serviceDocuments?.[sid] ?? []) as DocFile[];
        if (service && docs.length > 0) {
          const name = getServiceName(service) || sid;
          const displayName = `${name} (${docs.length} ${docs.length > 1 ? t("form.steps.summary.documentPlural") : t("form.steps.summary.document")})`;
          localizedNames[`service_${sid}`] = displayName;
          localizedLineItems.push({ type: "service", id: sid, name: displayName, quantity: docs.length });
          docs.forEach((doc) => {
            (doc.selectedOptions ?? []).forEach((optId) => {
              const opt = optionsMap[optId];
              if (opt) {
                const optName = getOptionName(opt) || optId;
                localizedNames[`option_${optId}`] = optName;
                localizedLineItems.push({ type: "option", id: optId, name: optName, quantity: 1 });
              }
            });
          });
        }
      });

      if (formData.deliveryMethod === "postal") {
        const deliveryName = t("form.steps.delivery.postTitle");
        localizedNames["delivery_postal"] = deliveryName;
        localizedLineItems.push({
          type: "delivery",
          id: "delivery_postal",
          name: deliveryName,
          quantity: 1,
        });
      }

      const submissionData = {
        ...formData,
        currency: currency,
        appointmentDate: new Date().toISOString().split("T")[0],
        appointmentTime: "09:00",
        timezone: formData.timezone || "UTC",
        signatoriesCount: 0,
        additionalSignatoriesCount: 0,
        additionalSignatoriesCost: 0,
        deliveryMethod: formData.deliveryMethod,
        deliveryPostalCostEUR: formData.deliveryMethod === "postal" ? DELIVERY_POSTAL_PRICE_EUR : 0,
        language,
        localizedLineItems,
        localizedNames,
        sessionId,
      };

      const retrySubmissionId = (formData.submissionId as string) || undefined;

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: submissionData,
          currency,
          ...(retrySubmissionId && { submissionId: retrySubmissionId }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setNotification({ type: "error", message });
      trackPaymentFailurePlausible({ message });
      trackPaymentFailure({ message });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData,
    totalDocuments,
    servicesMap,
    optionsMap,
    currency,
    language,
    t,
    router,
    getServiceName,
    getOptionName,
    getMissingInfo,
    getTotalAmount,
  ]);

  useEffect(() => {
    registerContinueHandler(handlePay);
  }, [registerContinueHandler, handlePay]);

  const truncateFileName = (fileName: string) => {
    if (isMobile && fileName.length > 30) {
      const ext = fileName.substring(fileName.lastIndexOf("."));
      const name = fileName.substring(0, fileName.lastIndexOf("."));
      return name.substring(0, 30 - ext.length - 3) + "..." + ext;
    }
    return fileName;
  };

  const renderPriceDetailsContent = () => (
    <>
      {formData.selectedServices && formData.selectedServices.length > 0 ? (
        <>
          {formData.selectedServices.map((serviceId) => {
            const service = servicesMap[serviceId];
            if (!service) return null;
            const docs = (formData.serviceDocuments?.[serviceId] ?? []) as DocFile[];
            const spInCur = getServicePriceInCurrency(service, currency);
            const serviceTotal = docs.length * spInCur;

            const optionCounts: Record<string, number> = {};
            docs.forEach((doc) => {
              (doc.selectedOptions ?? []).forEach((optId) => {
                const opt = optionsMap[optId];
                if (opt) optionCounts[optId] = (optionCounts[optId] || 0) + 1;
              });
            });

            return (
              <div key={serviceId}>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-xs sm:text-sm text-gray-700">
                    {getServiceName(service)} ({docs.length}{" "}
                    {docs.length > 1 ? t("form.steps.summary.documentPlural") : t("form.steps.summary.document")})
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                    {formatPriceSync(serviceTotal, currency)}
                  </span>
                </div>
                {Object.keys(optionCounts).length > 0 && (
                  <div className="ml-4 mt-2 space-y-1">
                    {Object.entries(optionCounts).map(([optId, count]) => {
                      const opt = optionsMap[optId];
                      if (!opt) return null;
                      const opInCur = getOptionPriceInCurrency(opt, currency);
                      const optTotal = count * opInCur;
                      return (
                        <div key={optId} className="flex justify-between items-center">
                          <span className="text-[10px] sm:text-xs text-gray-500 italic">
                            + {getOptionName(opt)} ({count}{" "}
                            {count > 1 ? t("form.steps.summary.documentPlural") : t("form.steps.summary.document")})
                          </span>
                          <span className="text-[10px] sm:text-xs font-semibold text-gray-700">
                            {formatPriceSync(optTotal, currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">{t("form.priceDetails.noServices")}</p>
        </div>
      )}

      {formData.selectedServices &&
        formData.selectedServices.length > 0 &&
        formData.deliveryMethod === "postal" && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-xs sm:text-sm text-gray-700">
              + {t("form.steps.summary.delivery")}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-gray-900">
              {convertedDeliveryPrice || formatPriceSync(DELIVERY_POSTAL_PRICE_EUR, "EUR")}
            </span>
          </div>
        )}

      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
        <span className="text-sm sm:text-base font-bold text-gray-900">
          {t("form.priceDetails.total")}
        </span>
        <span className="text-base sm:text-lg font-bold text-gray-900">
          {formatPriceSync(getTotalAmount(), currency)}
        </span>
      </div>
    </>
  );

  const renderPayButton = () => (
    formData.selectedServices &&
    formData.selectedServices.length > 0 && (
      <div className="pt-4 mt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handlePay}
          disabled={isSubmitting || loading}
          className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2563eb] disabled:hover:shadow-lg flex items-center justify-center gap-2.5 text-base border border-[#2563eb]"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>{t("form.steps.summary.processing")}</span>
            </>
          ) : (
            <>
              <Icon icon="heroicons:lock-closed" className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t("form.steps.summary.payNow")}</span>
            </>
          )}
        </button>
      </div>
    )
  );

  const stripeSecurityBlock = (
    <div className="pt-4 overflow-visible">
      <div className="flex items-center justify-between gap-3 sm:gap-4 text-gray-500 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <svg
            className="h-5 w-12 sm:h-6 sm:w-14 md:h-7 md:w-16 opacity-70 flex-shrink-0"
            viewBox="0 0 60 25"
            fill="#635BFF"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z" />
          </svg>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
            <Icon icon="heroicons:shield-check" className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            <span>{t("form.steps.summary.sslEncrypted")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
          <img
            src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/adc94d68-d0a7-44b1-12e8-b6897eded400/public"
            alt="Visa"
            className="h-8 w-auto object-contain sm:h-10 md:h-12"
          />
          <img
            src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/0b955f86-7260-4b31-c4f2-b6862dfdc800/public"
            alt="Mastercard"
            className="h-8 w-auto object-contain sm:h-10 md:h-12"
          />
          <img
            src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/e0c874f7-d036-4b30-6cf7-3a0d8d2dad00/public"
            alt="Maestro"
            className="h-8 w-auto object-contain sm:h-10 md:h-12"
          />
          <img
            src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/c36e6a86-80e6-442d-75ee-1a7818211100/public"
            alt="Girocard"
            className="h-8 w-auto object-contain sm:h-10 md:h-12"
          />
          <img
            src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/0f942aac-8365-4c9a-632e-0409cf064a00/public"
            alt="American Express"
            className="h-8 w-auto object-contain sm:h-10 md:h-12"
          />
          <img
            src="https://imagedelivery.net/l2xsuW0n52LVdJ7j0fQ5lA/558a365d-a98f-4aaf-eaf6-40b50c3cf600/public"
            alt="PayPal"
            className="h-8 w-auto object-contain sm:h-10 md:h-12"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
          duration={notification.type === "error" ? 8000 : 5000}
        />
      )}

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 w-full max-w-full"
        style={{
          minHeight: 0,
          paddingBottom: isMobile ? (isPriceDetailsOpen ? "520px" : "220px") : "120px",
        }}
      >
        <div className="w-full mx-auto">
          <div className="mb-3 sm:mb-4 lg:mb-6">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t("form.steps.summary.title")}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {t("form.steps.summary.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4 2xl:gap-6">
            {/* Left Column - Main Content */}
            <div className="2xl:col-span-7 space-y-3 sm:space-y-4 2xl:space-y-6 pb-20 2xl:pb-0">
              <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-3">
                <Icon icon="heroicons:information-circle" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-blue-900 mb-1">
                    {t("form.steps.summary.whatHappensNext")}
                  </h4>
                  <p
                    className="text-xs sm:text-sm text-blue-900 break-words"
                    dangerouslySetInnerHTML={{
                      __html: t("form.steps.summary.confirmationMessage")
                        .replace("{email}", `<strong>${formData.email || "your email"}</strong>`)
                        .replace(/secure link/g, "<strong>secure link</strong>")
                        .replace(/verify your identity/g, "<strong>verify your identity</strong>")
                        .replace(/video session/g, "<strong>video session</strong>")
                        .replace(/certified notary/g, "<strong>certified notary</strong>"),
                    }}
                  />
                </div>
              </div>

              {/* Services */}
              {formData.selectedServices && formData.selectedServices.length > 0 && (
                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                      {t("form.steps.summary.services")}
                    </h3>
                    <button
                      onClick={() => router.push("/form/documents")}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                    >
<Icon icon="heroicons:pencil-square" className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t("form.steps.summary.edit")}</span>
                  </button>
                </div>
                {totalDocuments === 0 ? (
                    <button
                      onClick={() => router.push("/form/documents")}
                      className="w-full mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-3 hover:bg-red-100 hover:border-red-400 transition-all group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <Icon icon="heroicons:exclamation-triangle" className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm sm:text-base font-semibold text-red-700">
                          {t("form.steps.summary.noDocumentsAlert")}
                        </p>
                        <p className="text-xs sm:text-sm text-red-600 mt-0.5">
                          {t("form.steps.summary.noDocumentsAlertDescription")}
                        </p>
                      </div>
                      <Icon icon="heroicons:arrow-right" className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                    </button>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {formData.selectedServices.map((serviceId) => {
                        const service = servicesMap[serviceId];
                        const docs = (formData.serviceDocuments?.[serviceId] ?? []) as DocFile[];
                        if (!service) return null;
                        const spInCur = getServicePriceInCurrency(service, currency);
                        return (
                          <div
                            key={serviceId}
                            className="border border-gray-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4 overflow-hidden"
                          >
                            <div className="mb-2 sm:mb-3">
                              <h4 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-900 break-words">
                                {getServiceName(service) || serviceId}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 break-words">
                                {docs.length}{" "}
                                {docs.length > 1
                                  ? t("form.steps.summary.documentPlural")
                                  : t("form.steps.summary.document")}{" "}
                                × {formatPriceSync(spInCur, currency)}
                              </p>
                            </div>
                            {docs.length > 0 && (
                              <div className="space-y-1.5 sm:space-y-2">
                                {docs.map((doc, index) => (
                                  <div
                                    key={index}
                                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-1.5 sm:p-2 bg-gray-50 rounded-lg gap-1.5 sm:gap-2"
                                  >
                                    <div className="flex items-center flex-1 min-w-0">
                                      <Icon
                                        icon="heroicons:document"
                                        className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-1.5 sm:mr-2 text-gray-600 flex-shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className="text-[10px] sm:text-xs font-medium text-gray-900 truncate"
                                          title={doc.name}
                                        >
                                          {truncateFileName(doc.name)}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-gray-500">
                                          {((doc.size || 0) / 1024).toFixed(2)} KB
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => setViewingFile(doc)}
                                        className="ml-2 p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                                        aria-label={`View ${doc.name}`}
                                        title={t("form.steps.documents.view")}
                                      >
                                        <Icon
                                          icon="heroicons:eye"
                                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 hover:text-gray-900"
                                        />
                                      </button>
                                    </div>
                                    {(doc.selectedOptions ?? []).length > 0 && (
                                      <div className="flex flex-wrap gap-1 flex-shrink-0 ml-5 sm:ml-7 lg:ml-0">
                                        {(doc.selectedOptions ?? []).map((optId) => {
                                          const opt = optionsMap[optId];
                                          return opt ? (
                                            <span
                                              key={optId}
                                              className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] lg:text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap"
                                            >
                                              <Icon
                                                icon={(opt as { icon?: string }).icon || "heroicons:check-badge"}
                                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 flex-shrink-0"
                                              />
                                              <span className="truncate max-w-[60px] sm:max-w-[80px] lg:max-w-none">
                                                {getOptionName(opt)}
                                              </span>
                                            </span>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Personal Information */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                    {t("form.steps.summary.personalInfo")}
                  </h3>
                  <button
                    onClick={() => router.push("/form/personal-info")}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Icon icon="heroicons:pencil-square" className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t("form.steps.summary.edit")}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl overflow-hidden">
                    <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
                      {t("form.steps.summary.fullName")}
                    </p>
                    <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-words">
                      {formData.firstName} {formData.lastName}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl overflow-hidden">
                    <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
                      {t("form.steps.summary.emailLabel")}
                    </p>
                    <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-all">
                      {formData.email}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl sm:col-span-2 overflow-hidden">
                    <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
                      {t("form.steps.summary.addressLabel")}
                    </p>
                    <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-900 break-words">
                      {formData.address}
                      {formData.city && `, ${formData.city}`}
                      {formData.postalCode && ` ${formData.postalCode}`}
                    </p>
                  </div>
                  {formData.notes && (
                    <div className="p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl sm:col-span-2 overflow-hidden">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">
                        {t("form.steps.summary.additionalNotes")}
                      </p>
                      <p className="text-[10px] sm:text-xs lg:text-sm text-gray-900 break-words">
                        {formData.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                    {t("form.steps.summary.delivery")}
                  </h3>
                  <button
                    onClick={() => router.push("/form/delivery")}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Icon icon="heroicons:pencil-square" className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t("form.steps.summary.edit")}</span>
                  </button>
                </div>
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                      {formData.deliveryMethod === "postal" ? (
                        <Icon
                          icon="heroicons:envelope"
                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700"
                        />
                      ) : (
                        <span className="text-lg sm:text-xl font-semibold text-gray-700">@</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                      {formData.deliveryMethod === "postal"
                        ? t("form.steps.delivery.postTitle")
                        : t("form.steps.delivery.emailTitle")}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">{getDeliveryDescription()}</p>
                    {formData.deliveryMethod === "postal" && convertedDeliveryPrice && (
                      <p className="text-[10px] sm:text-xs font-semibold text-gray-900 mt-1">
                        {t("form.steps.summary.deliveryPrice")}: {convertedDeliveryPrice}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms */}
              <p
                className="text-[10px] sm:text-xs text-gray-500 mt-2 px-1 [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800"
                dangerouslySetInnerHTML={{ __html: t("form.steps.summary.termsAcceptance") }}
              />
            </div>

            {/* Right Column - Price Details Sidebar (Desktop 2xl+) */}
            <div className="2xl:col-span-5 hidden 2xl:block">
              <div className="sticky top-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200 overflow-hidden shadow-xl w-full">
                  <div className="w-full flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon icon="heroicons:currency-dollar" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      <h3 className="text-base font-semibold text-gray-900">
                        {t("form.priceDetails.title")}
                      </h3>
                    </div>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
                    </div>
                  ) : (
                    <div className="space-y-2">{renderPriceDetailsContent()}</div>
                  )}
                  {renderPayButton()}
                  {stripeSecurityBlock}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Fixed Price Details at bottom */}
      {isMobile &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-0 left-0 right-0 z-[100]">
            <div className="bg-white rounded-t-xl sm:rounded-t-2xl p-4 sm:p-6 border border-gray-200 overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.15)] w-full">
              <button
                onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
                className={`w-full flex items-center justify-between cursor-pointer ${isPriceDetailsOpen ? "mb-4" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <Icon icon="heroicons:currency-dollar" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    {t("form.priceDetails.title")}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {!isPriceDetailsOpen && (
                    <span className="text-sm sm:text-base font-bold text-gray-900">
                      {formatPriceSync(getTotalAmount(), currency)}
                    </span>
                  )}
                  <Icon
                    icon={isPriceDetailsOpen ? "heroicons:chevron-down" : "heroicons:chevron-up"}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600"
                  />
                </div>
              </button>
              {isPriceDetailsOpen && (
                <>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-black" />
                    </div>
                  ) : (
                    <div className="space-y-2">{renderPriceDetailsContent()}</div>
                  )}
                  {stripeSecurityBlock}
                </>
              )}
              {renderPayButton()}
            </div>
          </div>,
          document.body
        )}

      {/* Document preview modal */}
      {viewingFile && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setViewingFile(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl max-h-[90vh] w-full overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900 truncate">{viewingFile.name}</h3>
              <button
                onClick={() => setViewingFile(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <Icon icon="heroicons:x-mark" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            {viewingFile.url ? (
              <iframe
                src={viewingFile.url}
                title={viewingFile.name}
                className="w-full h-[70vh] border rounded-lg"
              />
            ) : (
              <p className="text-sm text-gray-600">
                {t("form.steps.documents.previewNotAvailable")}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

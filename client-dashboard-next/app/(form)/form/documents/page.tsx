"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useServices } from "@/contexts/ServicesContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { uploadDocument, deleteDocument } from "@/lib/utils/formDraft";
import { getServicePriceInCurrency, getOptionPriceInCurrency } from "@/lib/utils/pricing";
import { formatPriceSync } from "@/lib/utils/currency";
import Notification from "@/components/form/Notification";
import type { FormData } from "@/lib/formData";

const APOSTILLE_SERVICE_ID = "473fb677-4dd3-4766-8221-0250ea3440cd";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
const MAX_SIZE = 50 * 1024 * 1024;

type DocFile = {
  name: string;
  size: number;
  type: string;
  path?: string;
  url?: string;
  dataUrl?: string;
  selectedOptions?: string[];
  error?: string;
};

function getFileTypeIcon(file: DocFile) {
  const name = (file.name ?? "").toLowerCase();
  const type = (file.type ?? "").toLowerCase();
  if (name.endsWith(".pdf") || type === "application/pdf")
    return { icon: "mdi:file-pdf-box", color: "text-red-600", bgColor: "bg-red-50" };
  if (name.endsWith(".png") || type === "image/png")
    return { icon: "mdi:file-image", color: "text-blue-600", bgColor: "bg-blue-50" };
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || type.includes("jpeg"))
    return { icon: "mdi:file-image", color: "text-purple-600", bgColor: "bg-purple-50" };
  if (name.endsWith(".gif") || type === "image/gif")
    return { icon: "mdi:file-image", color: "text-pink-600", bgColor: "bg-pink-50" };
  if (name.endsWith(".webp") || type === "image/webp")
    return { icon: "mdi:file-image", color: "text-green-600", bgColor: "bg-green-50" };
  return { icon: "heroicons:document", color: "text-gray-600", bgColor: "bg-gray-50" };
}

function truncateFileName(fileName: string, isMobile: boolean): string {
  if (isMobile && fileName.length > 30) {
    const ext = fileName.substring(fileName.lastIndexOf("."));
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
    return nameWithoutExt.substring(0, 30 - ext.length - 3) + "..." + ext;
  }
  return fileName;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { registerContinueHandler, setIsUploading } = useFormActions();
  const { getServicesByIds, options, loading: servicesLoading, getServiceName } = useServices();
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const [services, setServices] = useState<{ service_id: string; name?: string; [key: string]: unknown }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingServices, setUploadingServices] = useState<Record<string, boolean>>({});
  const [viewingFile, setViewingFile] = useState<DocFile | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [footerPadding, setFooterPadding] = useState(160);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPositionRef = useRef<number | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (servicesLoading) {
      setLoading(true);
      return;
    }
    const ids = formData.selectedServices ?? [];
    if (ids.length > 0) {
      setServices(getServicesByIds(ids));
    } else {
      setServices([]);
    }
    setLoading(false);
  }, [formData.selectedServices, getServicesByIds, servicesLoading]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let checkInterval: ReturnType<typeof setInterval> | null = null;
    let resizeHandler: (() => void) | null = null;
    const calculateFooterPadding = () => {
      const footer = document.querySelector('[data-footer="notary-form"]');
      if (footer && footer.offsetHeight > 0) {
        const footerHeight = footer.offsetHeight;
        const desiredGap = isMobile ? 50 : 20;
        setFooterPadding(footerHeight + desiredGap);
        return true;
      }
      return false;
    };
    const setup = () => {
      const footer = document.querySelector('[data-footer="notary-form"]');
      if (footer && footer.offsetHeight > 0) {
        if (!resizeObserver) {
          resizeObserver = new ResizeObserver(calculateFooterPadding);
          resizeObserver.observe(footer);
        }
        if (!resizeHandler) {
          resizeHandler = calculateFooterPadding;
          window.addEventListener("resize", resizeHandler);
        }
        calculateFooterPadding();
        return true;
      }
      return false;
    };
    const t1 = setTimeout(() => {
      if (!setup()) {
        let attempts = 0;
        checkInterval = setInterval(() => {
          attempts++;
          if (setup() || attempts >= 30) {
            if (checkInterval) clearInterval(checkInterval);
            if (attempts >= 30) setFooterPadding(isMobile ? 110 : 100);
          }
        }, 100);
      }
    }, 200);
    return () => {
      clearTimeout(t1);
      resizeObserver?.disconnect();
      if (checkInterval) clearInterval(checkInterval);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    };
  }, [isMobile]);

  useEffect(() => {
    if (savedScrollPositionRef.current !== null && scrollContainerRef.current) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current && savedScrollPositionRef.current !== null) {
          scrollContainerRef.current.scrollTop = savedScrollPositionRef.current;
          savedScrollPositionRef.current = null;
        }
      });
    }
  }, [formData.serviceDocuments]);

  const isAnyUploading = Object.values(uploadingServices).some(Boolean);

  useEffect(() => {
    setIsUploading(isAnyUploading);
  }, [isAnyUploading, setIsUploading]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      const invalid = files.filter((f) => !ALLOWED_TYPES.includes(f.type.toLowerCase()));
      if (invalid.length > 0) {
        setNotification({
          type: "error",
          message: t("form.steps.documents.invalidFileFormat").replace("{fileNames}", invalid.map((f) => f.name).join(", ")),
        });
        e.target.value = "";
        return;
      }

      setUploadingServices((p) => ({ ...p, [serviceId]: true }));
      if (scrollContainerRef.current) savedScrollPositionRef.current = scrollContainerRef.current.scrollTop;
      const inputEl = e.target;
      inputEl.value = "";
      setTimeout(() => { if (inputEl) inputEl.value = ""; }, 0);

      try {
        const sessionId = typeof window !== "undefined" ? localStorage.getItem("formSessionId") ?? undefined : undefined;
        const uploaded: DocFile[] = [];

        for (const file of files) {
          if (file.size > MAX_SIZE) {
            setNotification({ type: "error", message: t("form.steps.documents.fileTooLarge") });
            uploaded.push({ name: file.name, size: file.size, type: file.type, error: "File too large" });
            continue;
          }
          try {
            const u = await uploadDocument(file, serviceId, sessionId);
            uploaded.push({
              name: u.name,
              size: u.size,
              type: u.type,
              path: u.path,
              url: u.url,
              selectedOptions: [],
            });
          } catch {
            uploaded.push({ name: file.name, size: file.size, type: file.type, error: "Upload failed" });
          }
        }

        const ok = uploaded.filter((x) => !x.error);
        const failed = uploaded.filter((x) => x.error);
        if (failed.length > 0) {
          setNotification({
            type: "error",
            message: t("form.steps.documents.uploadError") || `${failed.length} fichier(s) en échec`,
          });
        }
        if (ok.length > 0) {
          updateFormData((prev: FormData) => {
            const docs = { ...(prev.serviceDocuments ?? {}) };
            const existing = (docs[serviceId] ?? []) as DocFile[];
            docs[serviceId] = [...existing, ...ok];
            return { serviceDocuments: docs };
          });
          setNotification({ type: "success", message: t("form.steps.documents.uploadSuccess") });
        }
      } finally {
        setUploadingServices((p) => ({ ...p, [serviceId]: false }));
      }
    },
    [updateFormData, t]
  );

  const removeFile = useCallback(
    async (serviceId: string, fileIndex: number) => {
      const docs = formData.serviceDocuments?.[serviceId] as DocFile[] | undefined;
      const file = docs?.[fileIndex];
      if (file?.path) {
        try {
          await deleteDocument(file.path);
        } catch {
          /* ignore */
        }
      }
      updateFormData((prev: FormData) => {
        const serviceDocuments = { ...(prev.serviceDocuments ?? {}) };
        const arr = [...((serviceDocuments[serviceId] ?? []) as DocFile[])];
        arr.splice(fileIndex, 1);
        if (arr.length === 0) delete serviceDocuments[serviceId];
        else serviceDocuments[serviceId] = arr;
        return { serviceDocuments };
      });
    },
    [formData.serviceDocuments, updateFormData]
  );

  const toggleOption = useCallback(
    (serviceId: string, fileIndex: number, optionId: string) => {
      updateFormData((prev: FormData) => {
        const serviceDocuments = { ...(prev.serviceDocuments ?? {}) };
        const arr = [...((serviceDocuments[serviceId] ?? []) as DocFile[])];
        const file = arr[fileIndex];
        if (!file) return prev;
        const opts = file.selectedOptions ?? [];
        const next = opts.includes(optionId) ? opts.filter((id) => id !== optionId) : [...opts, optionId];
        arr[fileIndex] = { ...file, selectedOptions: next };
        serviceDocuments[serviceId] = arr;
        return { serviceDocuments };
      });
    },
    [updateFormData]
  );

  const getTotalPrice = useCallback(
    (service: { service_id: string; [key: string]: unknown }) => {
      const files = (formData.serviceDocuments?.[service.service_id] ?? []) as DocFile[];
      let total = 0;
      const pricePerDoc = getServicePriceInCurrency(service as { service_id: string; base_price?: number; price_usd?: number; price_gbp?: number }, currency);
      files.forEach((file) => {
        total += pricePerDoc;
        (file.selectedOptions ?? []).forEach((optId) => {
          const opt = options.find((o) => o.option_id === optId);
          if (opt) total += getOptionPriceInCurrency(opt, currency);
        });
      });
      return formatPriceSync(total, currency);
    },
    [formData.serviceDocuments, options, currency]
  );

  const handleNext = useCallback(() => {
    if (isAnyUploading) {
      setNotification({ type: "warning", message: t("form.steps.documents.uploadInProgress") });
      return;
    }
    router.push("/form/delivery");
  }, [isAnyUploading, router, t]);

  useEffect(() => {
    registerContinueHandler(handleNext);
  }, [registerContinueHandler, handleNext]);

  return (
    <div className="h-full w-full flex flex-col relative max-w-full overflow-x-hidden">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 w-full max-w-full"
        style={{ minHeight: 0, paddingBottom: isMobile ? `${footerPadding}px` : "144px" }}
      >
        <div className={`max-w-4xl mx-auto w-full ${services.length === 1 && isMobile && !loading ? "h-full flex flex-col min-h-0" : ""}`}>
          <div className="mb-3 sm:mb-4 flex-shrink-0">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t("form.steps.documents.title")}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">{t("form.steps.documents.subtitle")}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-black border-t-transparent" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t("form.steps.documents.noServicesSelected")}</p>
            </div>
          ) : (
            <div className={`space-y-3 sm:space-y-4 w-full max-w-full ${services.length === 1 && isMobile ? "flex flex-col flex-1 min-h-0" : ""}`}>
              {services.map((service) => {
                const files = (formData.serviceDocuments?.[service.service_id] ?? []) as DocFile[];
                const fileCount = files.length;
                const price = getServicePriceInCurrency(service as { service_id: string; base_price?: number; price_usd?: number; price_gbp?: number }, currency);
                const uploading = uploadingServices[service.service_id];
                const isApostilleService = service.service_id === APOSTILLE_SERVICE_ID;
                const shouldTakeFullHeight = services.length === 1 && isMobile && files.length === 0;

                return (
                  <div
                    key={service.service_id}
                    className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 w-full max-w-full box-border ${shouldTakeFullHeight ? "flex-1 flex flex-col min-h-0" : ""}`}
                    style={
                      isMobile && files.length === 0
                        ? { minHeight: "400px", display: "flex", flexDirection: "column" }
                        : {}
                    }
                  >
                    <div className="mb-3 sm:mb-4">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 break-words">{getServiceName(service)}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                        {formatPriceSync(price, currency)} {t("form.steps.documents.perDocument")}
                      </p>
                      {fileCount > 0 && (
                        <p className="text-xs sm:text-sm font-semibold text-black mt-0.5 sm:mt-1">
                          {t("form.steps.documents.total")}: {getTotalPrice(service)} ({fileCount}{" "}
                          {fileCount > 1 ? t("form.steps.summary.documentPlural") : t("form.steps.summary.document")})
                        </p>
                      )}
                    </div>

                    <div
                      className={`block mb-3 sm:mb-4 w-full ${shouldTakeFullHeight ? "flex-1 flex flex-col min-h-0" : isMobile && files.length === 0 ? "flex-1 flex flex-col min-h-0" : ""}`}
                    >
                      <div
                        className={`group relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-8 md:p-12 lg:p-16 text-center cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-200 active:bg-blue-100 active:border-blue-300 focus-within:bg-blue-50 focus-within:border-blue-200 w-full max-w-full overflow-hidden ${shouldTakeFullHeight ? "flex-1 flex flex-col justify-center" : isMobile && files.length === 0 ? "flex-1 flex flex-col justify-center min-h-0" : isMobile ? "flex flex-col justify-center" : ""}`}
                        style={
                          shouldTakeFullHeight && isMobile
                            ? { maxHeight: "100%", minHeight: "250px" }
                            : isMobile && files.length === 0
                              ? { minHeight: "250px", height: "100%" }
                              : isMobile
                                ? { minHeight: "250px" }
                                : {}
                        }
                        onClick={() => {
                          if (uploading) return;
                          if (scrollContainerRef.current) savedScrollPositionRef.current = scrollContainerRef.current.scrollTop;
                          fileInputRefs.current[service.service_id]?.click();
                        }}
                      >
                        {uploading && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm">
                            <Icon icon="svg-spinners:ring-resize" className="mb-3 h-12 w-12 sm:h-16 sm:w-16 text-blue-600" />
                            <p className="text-sm font-medium text-gray-900 sm:text-base">{t("form.steps.documents.uploading")}</p>
                            <p className="mt-1 text-xs text-gray-600 sm:text-sm">{t("form.steps.documents.pleaseWait")}</p>
                          </div>
                        )}

                        <Icon
                          icon="hugeicons:file-upload"
                          className={`mx-auto mb-2 flex-shrink-0 text-black transition-colors group-hover:text-blue-600 sm:mb-4 md:mb-5 ${shouldTakeFullHeight ? "mb-6" : ""} h-8 w-8 sm:h-12 sm:w-12 md:h-14 md:w-14`}
                        />
                        <p
                          className={`mb-1 px-1 font-medium text-black transition-colors break-words group-hover:text-blue-700 sm:mb-2 md:mb-3 ${shouldTakeFullHeight ? "mb-3 text-base" : ""} text-xs sm:text-base md:text-lg`}
                        >
                          {t("form.steps.documents.clickToUpload") || "Click here or drag & drop your document"}
                        </p>
                        <p
                          className={`mb-3 px-1 break-words text-gray-600 sm:mb-4 ${shouldTakeFullHeight ? "text-sm" : ""} text-[10px] sm:text-xs md:text-sm leading-relaxed`}
                        >
                          {t("form.steps.documents.uploadDescriptionLong")}
                        </p>

                        <div className="hidden flex-wrap items-center justify-center gap-3 px-2 sm:flex sm:gap-4 md:gap-6">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Icon icon="heroicons:lock-closed" className="h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5" />
                            <span className="whitespace-nowrap font-light text-[9px] sm:text-[10px]">{t("form.steps.documents.encryptedSecure")}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Icon icon="heroicons:trash" className="h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5" />
                            <span className="whitespace-nowrap font-light text-[9px] sm:text-[10px]">{t("form.steps.documents.autoDeleted")}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Icon icon="heroicons:check-badge" className="h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5" />
                            <span className="whitespace-nowrap font-light text-[9px] sm:text-[10px]">{t("form.steps.documents.gdprCompliant")}</span>
                          </div>
                        </div>

                        <input
                          ref={(el) => {
                            fileInputRefs.current[service.service_id] = el;
                          }}
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,image/*,application/pdf"
                          className="sr-only"
                          tabIndex={-1}
                          disabled={uploading}
                          onChange={(e) => handleFileUpload(e, service.service_id)}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => {
                            e.stopPropagation();
                            if (scrollContainerRef.current && savedScrollPositionRef.current !== null) {
                              scrollContainerRef.current.scrollTop = savedScrollPositionRef.current;
                            }
                          }}
                        />
                      </div>
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-2 sm:space-y-3">
                        {files.map((file, idx) => {
                          const ft = getFileTypeIcon(file);
                          return (
                            <div
                              key={idx}
                              className={`rounded-lg border border-gray-200 p-3 sm:rounded-xl sm:p-4 ${isMobile && idx === files.length - 1 ? "mb-3" : ""}`}
                            >
                              <div className="mb-2 flex flex-wrap items-start justify-between gap-2 sm:mb-3">
                                <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-3">
                                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${ft.bgColor}`}>
                                    <Icon icon={ft.icon} className={`h-5 w-5 sm:h-6 sm:w-6 ${ft.color}`} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-gray-900 sm:text-sm" title={file.name}>
                                      {truncateFileName(file.name, isMobile)}
                                    </p>
                                    <p className="text-[10px] text-gray-500 sm:text-xs">{(file.size / 1024).toFixed(2)} KB</p>
                                  </div>
                                </div>
                                <div className="ml-auto flex flex-shrink-0 items-center gap-1 sm:gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingFile(file);
                                    }}
                                    className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-gray-200 sm:p-2"
                                    aria-label={t("form.steps.documents.view")}
                                    title={t("form.steps.documents.view")}
                                  >
                                    <Icon icon="heroicons:eye" className="h-4 w-4 text-gray-600 hover:text-gray-900 sm:h-5 sm:w-5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(service.service_id, idx)}
                                    className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-gray-100 sm:p-2"
                                    aria-label={t("form.steps.documents.remove")}
                                  >
                                    <Icon icon="heroicons:trash" className="h-4 w-4 text-red-600 sm:h-5 sm:w-5" />
                                  </button>
                                </div>
                              </div>

                              {!isApostilleService && options.length > 0 && (
                                <div className="space-y-1.5 border-t border-gray-100 pt-2 sm:space-y-2 sm:pt-3">
                                  {options.map((opt) => (
                                    <div key={opt.option_id} className="space-y-1">
                                      <div className="flex items-start gap-2">
                                        <label className="group flex min-w-0 flex-1 cursor-pointer items-start space-x-1.5 sm:space-x-2">
                                          <div className="relative mt-0.5 flex-shrink-0">
                                            <input
                                              type="checkbox"
                                              checked={file.selectedOptions?.includes(opt.option_id) ?? false}
                                              onChange={() => toggleOption(service.service_id, idx, opt.option_id)}
                                              className="peer sr-only"
                                            />
                                            <div className="flex h-4 w-4 items-center justify-center rounded border-2 border-blue-300 transition-all peer-checked:border-blue-600 peer-checked:bg-blue-600 group-hover:border-blue-400 sm:h-5 sm:w-5">
                                              {file.selectedOptions?.includes(opt.option_id) && (
                                                <Icon icon="heroicons:check" className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" />
                                              )}
                                            </div>
                                          </div>
                                          <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                              <span className="break-words text-xs font-medium text-gray-700 transition-colors group-hover:text-black sm:text-sm">
                                                {opt.name}
                                              </span>
                                              <span className="whitespace-nowrap font-normal text-gray-500 text-[10px] sm:text-xs">
                                                (+{formatPriceSync(getOptionPriceInCurrency(opt, currency), currency)})
                                              </span>
                                            </div>
                                            {opt.description && (
                                              <p className="break-words text-[10px] text-gray-600 sm:text-xs">{opt.description}</p>
                                            )}
                                          </div>
                                        </label>
                                      </div>
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {viewingFile &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "#000000",
              zIndex: 99999,
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setViewingFile(null);
              }}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: "fixed",
                top: 24,
                right: 24,
                zIndex: 100000,
                padding: "12px 20px",
                backgroundColor: "#3b82f6",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "white",
                fontSize: 16,
                fontWeight: 500,
              }}
              aria-label={t("form.steps.documents.close")}
            >
              <Icon icon="heroicons:x-mark" style={{ width: 20, height: 20 }} />
              <span>{t("form.steps.documents.close")}</span>
            </button>

            <div style={{ width: "100%", height: "100vh", overflow: "auto" }}>
              {(viewingFile.dataUrl || viewingFile.url) && (
                <>
                  {viewingFile.type?.startsWith("image/") ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100vh", padding: 32 }}>
                      <img
                        src={viewingFile.dataUrl || viewingFile.url}
                        alt={viewingFile.name}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        onError={(e) => {
                          if (viewingFile.url && (e.target as HTMLImageElement).src !== viewingFile.url) {
                            (e.target as HTMLImageElement).src = viewingFile.url!;
                          }
                        }}
                      />
                    </div>
                  ) : viewingFile.type === "application/pdf" || viewingFile.name?.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={viewingFile.dataUrl || viewingFile.url}
                      style={{ width: "100%", height: "100vh", border: 0 }}
                      title={viewingFile.name}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "100vh",
                        textAlign: "center",
                        padding: 32,
                        backgroundColor: "white",
                      }}
                    >
                      <Icon icon="heroicons:document" style={{ width: 80, height: 80, color: "#9ca3af", marginBottom: 24 }} />
                      <p style={{ fontSize: 16, color: "#4b5563", marginBottom: 24 }}>
                        {t("form.steps.documents.previewNotAvailable") || "Preview not available for this file type."}
                      </p>
                      <a
                        href={viewingFile.dataUrl || viewingFile.url}
                        download={viewingFile.name}
                        style={{
                          padding: "12px 24px",
                          backgroundColor: "#000000",
                          color: "white",
                          borderRadius: 8,
                          fontSize: 16,
                          fontWeight: 500,
                          textDecoration: "none",
                        }}
                      >
                        {t("form.steps.documents.download") || "Download"}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {notification && (
        <Notification type={notification.type} message={notification.message} onClose={() => setNotification(null)} />
      )}
    </div>
  );
}

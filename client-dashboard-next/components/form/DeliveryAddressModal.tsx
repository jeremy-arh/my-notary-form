"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useFormData } from "@/contexts/FormContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DELIVERY_OPTIONS, type DeliveryOptionKey } from "@/lib/utils/pricing";
import { formatPriceSync, convertPriceSync } from "@/lib/utils/currency";
import AddressAutocomplete, { type AddressData } from "./AddressAutocomplete";
import { Skeleton } from "@/components/ui/skeleton";

type PriceState = { priceEUR: number | null; deliveryDays: string; carrier?: string; loading: boolean; error: string | null };

// Carriers with recommandé express (tracked + signature, not faster)
const RECOMMANDE_CARRIERS = new Set(["laposte", "postch", "bpost"]);

// Brandfetch CDN logos + brand colours de fallback
const CARRIER_INFO: Record<string, {
  name: string;
  logoUrl?: string;  // URL Brandfetch CDN (réel logo)
  bg: string;        // couleur de fond du badge
  textColor: string; // couleur du texte fallback
}> = {
  laposte:      { name: "La Poste",      logoUrl: "https://cdn.brandfetch.io/idlM2c7h_Z/w/320/h/320/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1764399739107",  bg: "#FFD700", textColor: "#003189" },
  dhl:          { name: "DHL",           logoUrl: "https://cdn.brandfetch.io/idv0ZbfQqf/w/200/h/200/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1667569261777",  bg: "#FFCC00", textColor: "#D40511" },
  deutschepost: { name: "Deutsche Post", logoUrl: "https://cdn.brandfetch.io/idEv_pJ-0j/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1675933842469",               bg: "#FFCC00", textColor: "#000000" },
  royalmail:    { name: "Royal Mail",    logoUrl: "https://cdn.brandfetch.io/idKOGR-UKJ/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1767335584700",               bg: "#E8112D", textColor: "#ffffff" },
  postnl:       { name: "PostNL",        logoUrl: "https://cdn.brandfetch.io/idTNl4rRGm/w/180/h/178/theme/dark/logo.png?c=1bxid64Mup7aczewSAYMX&t=1700127567140",  bg: "#FF6200", textColor: "#ffffff" },
  bpost:        { name: "bpost",         logoUrl: "https://cdn.brandfetch.io/idTcQXHvq8/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1690228255894",             bg: "#E41E20", textColor: "#ffffff" },
  postch:       { name: "Swiss Post",    logoUrl: "https://cdn.brandfetch.io/idhzR7VkdT/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1767336731664",               bg: "#FFCC00", textColor: "#D40511" },
  austrianpost: { name: "Öst. Post",                                                                                                                                  bg: "#C8102E", textColor: "#ffffff" },
  indiapost:    { name: "India Post",                                                                                                                                  bg: "#FF9933", textColor: "#ffffff" },
};

function CarrierLogo({ carrier }: { carrier: string }) {
  const [imgError, setImgError] = useState(false);
  const info = CARRIER_INFO[carrier];

  if (!info) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon icon="heroicons:truck" className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
      style={{ backgroundColor: info.bg }}
      title={info.name}
    >
      {info.logoUrl && !imgError ? (
        <img
          src={info.logoUrl}
          alt={info.name}
          width={36}
          height={36}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[7px] font-black text-center leading-tight px-0.5" style={{ color: info.textColor }}>
          {info.name}
        </span>
      )}
    </div>
  );
}

interface DeliveryAddressModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    deliveryAddress: string;
    deliveryCity: string;
    deliveryPostalCode: string;
    deliveryCountry: string;
    deliveryOption: DeliveryOptionKey;
    deliveryPriceEUR: number;
    usePersonalAddressForDelivery: boolean;
  }) => void;
}

export default function DeliveryAddressModal({
  open,
  onClose,
  onConfirm,
}: DeliveryAddressModalProps) {
  const { formData } = useFormData();
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const [usePersonalAddress, setUsePersonalAddress] = useState(true);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [selectedOption, setSelectedOption] = useState<DeliveryOptionKey | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dynamicPrices, setDynamicPrices] = useState<Record<DeliveryOptionKey, PriceState>>({
    standard: { priceEUR: null, deliveryDays: DELIVERY_OPTIONS.standard.deliveryDays, loading: false, error: null },
    express: { priceEUR: null, deliveryDays: DELIVERY_OPTIONS.express.deliveryDays, loading: false, error: null },
  });

  // Si adresse personnelle : utiliser formData.country, ou dériver du dernier segment de l'adresse (ex. "31 Rue X, Arbanats, France" → "France")
  const countryFromAddress = (formData.address ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .pop() ?? "";
  const effectiveCountry = usePersonalAddress
    ? ((formData.country ?? "") || countryFromAddress)
    : country;

  useEffect(() => {
    if (open) {
      setUsePersonalAddress(formData.usePersonalAddressForDelivery ?? true);
      setAddress(formData.deliveryAddress ?? "");
      setCity(formData.deliveryCity ?? "");
      setPostalCode(formData.deliveryPostalCode ?? "");
      setCountry(formData.deliveryCountry ?? "");
      setSelectedOption((formData.deliveryOption as DeliveryOptionKey) ?? null);
      setErrors({});
      setDynamicPrices({
        standard: { priceEUR: null, deliveryDays: DELIVERY_OPTIONS.standard.deliveryDays, loading: false, error: null },
        express: { priceEUR: null, deliveryDays: DELIVERY_OPTIONS.express.deliveryDays, loading: false, error: null },
      });
    }
  }, [open, formData]);

  useEffect(() => {
    if (!open || !effectiveCountry?.trim()) {
      setDynamicPrices((prev) => ({
        standard: { ...prev.standard, loading: false },
        express: { ...prev.express, loading: false },
      }));
      return;
    }
    setDynamicPrices((prev) => ({
      standard: { ...prev.standard, loading: true, error: null },
      express: { ...prev.express, loading: true, error: null },
    }));
    const params = new URLSearchParams({
      address: usePersonalAddress ? (formData.address ?? "") : address,
      city: usePersonalAddress ? (formData.city ?? "") : city,
      postalCode: usePersonalAddress ? (formData.postalCode ?? "") : postalCode,
      country: effectiveCountry,
    });
    fetch(`/api/delivery-price?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDynamicPrices({
          standard: {
            priceEUR: data.standard?.priceEUR ?? null,
            deliveryDays: data.standard?.deliveryDays ?? DELIVERY_OPTIONS.standard.deliveryDays,
            carrier: data.standard?.carrier ?? undefined,
            loading: false,
            error: null,
          },
          express: {
            priceEUR: data.express?.priceEUR ?? null,
            deliveryDays: data.express?.deliveryDays ?? DELIVERY_OPTIONS.express.deliveryDays,
            carrier: data.express?.carrier ?? undefined,
            loading: false,
            error: null,
          },
        });
      })
      .catch((err) => {
        setDynamicPrices((prev) => ({
          standard: { ...prev.standard, loading: false, error: err.message },
          express: { ...prev.express, loading: false, error: err.message },
        }));
      });
  }, [open, effectiveCountry, usePersonalAddress, formData.address, formData.city, formData.postalCode, address, city, postalCode]);

  const formatPrice = useCallback(
    (eurPrice: number) => {
      const amount =
        currency === "EUR"
          ? eurPrice
          : convertPriceSync(eurPrice, currency);
      return formatPriceSync(amount, currency);
    },
    [currency]
  );

  const handleAddressSelect = useCallback((data: AddressData) => {
    setAddress(data.formatted_address || data.address);
    setCity(data.city);
    setPostalCode(data.postal_code);
    setCountry(data.country);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.address;
      return next;
    });
  }, []);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!usePersonalAddress && !address.trim()) {
      newErrors.address = t("form.delivery.modal.errorAddress");
    }
    if (!selectedOption) {
      newErrors.option = t("form.delivery.modal.errorOption");
    }
    if (selectedOption && effectiveCountry?.trim()) {
      const ps = dynamicPrices[selectedOption];
      if (ps?.loading) {
        newErrors.option = t("form.delivery.modal.priceLoading");
      } else if (ps?.error) {
        newErrors.option = ps.error;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [usePersonalAddress, address, selectedOption, effectiveCountry, dynamicPrices, t]);

  const handleConfirm = useCallback(() => {
    if (!validate()) return;

    const finalAddress = usePersonalAddress ? formData.address : address;
    const finalCity = usePersonalAddress ? formData.city : city;
    const finalPostalCode = usePersonalAddress ? formData.postalCode : postalCode;
    const finalCountry = usePersonalAddress ? formData.country : country;

    const priceState = selectedOption ? dynamicPrices[selectedOption] : null;
    const priceEUR = priceState?.priceEUR ?? DELIVERY_OPTIONS[selectedOption!]?.priceEUR ?? 0;

    onConfirm({
      deliveryAddress: finalAddress,
      deliveryCity: finalCity,
      deliveryPostalCode: finalPostalCode,
      deliveryCountry: finalCountry,
      deliveryOption: selectedOption!,
      deliveryPriceEUR: priceEUR,
      usePersonalAddressForDelivery: usePersonalAddress,
    });
  }, [
    validate,
    usePersonalAddress,
    formData,
    address,
    city,
    postalCode,
    country,
    selectedOption,
    dynamicPrices,
    onConfirm,
  ]);

  if (!open) return null;

  const personalAddressDisplay = [formData.address, formData.city, formData.postalCode, formData.country]
    .filter(Boolean)
    .join(", ");

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />


      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            {t("form.delivery.modal.title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon icon="heroicons:x-mark" className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* Address section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              {t("form.delivery.modal.addressTitle")}
            </h4>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setUsePersonalAddress(true)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  usePersonalAddress
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      usePersonalAddress ? "border-black" : "border-gray-300"
                    }`}
                  >
                    {usePersonalAddress && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {t("form.delivery.modal.usePersonalAddress")}
                    </p>
                    {personalAddressDisplay && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {personalAddressDisplay}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUsePersonalAddress(false)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  !usePersonalAddress
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      !usePersonalAddress ? "border-black" : "border-gray-300"
                    }`}
                  >
                    {!usePersonalAddress && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {t("form.delivery.modal.useNewAddress")}
                  </p>
                </div>
              </button>
            </div>

            {!usePersonalAddress && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("form.delivery.modal.addressLabel")}
                  </label>
                  <AddressAutocomplete
                    value={address}
                    onChange={(v) => {
                      setAddress(v);
                      if (errors.address) setErrors((prev) => { const n = { ...prev }; delete n.address; return n; });
                    }}
                    onAddressSelect={handleAddressSelect}
                    placeholder={t("form.delivery.modal.addressPlaceholder")}
                    className={errors.address ? "border-red-500" : ""}
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-red-600">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t("form.delivery.modal.cityLabel")}
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t("form.delivery.modal.postalCodeLabel")}
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("form.delivery.modal.countryLabel")}
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Delivery options section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              {t("form.delivery.modal.optionTitle")}
            </h4>
            {errors.option && (
              <p className="mb-2 text-xs text-red-600">{errors.option}</p>
            )}

            {!effectiveCountry?.trim() && (
              <p className="mb-2 text-xs text-amber-600">
                {t("form.delivery.modal.selectAddressFirst")}
              </p>
            )}
            <div className="space-y-2">
              {(Object.keys(DELIVERY_OPTIONS) as DeliveryOptionKey[]).map((key) => {
                const opt = DELIVERY_OPTIONS[key];
                const priceState = dynamicPrices[key];
                const isSelected = selectedOption === key;
                const displayPrice = priceState?.priceEUR != null
                  ? formatPrice(priceState.priceEUR)
                  : priceState?.loading
                    ? "..."
                    : formatPrice(opt.priceEUR);
                const displayDays = priceState?.deliveryDays ?? opt.deliveryDays;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedOption(key);
                      if (errors.option) setErrors((prev) => { const n = { ...prev }; delete n.option; return n; });
                    }}
                    disabled={!effectiveCountry?.trim() || priceState?.loading}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-black bg-gray-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    } ${!effectiveCountry?.trim() || priceState?.loading ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {priceState?.loading ? (
                          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                        ) : priceState?.carrier ? (
                          <CarrierLogo carrier={priceState.carrier} />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Icon
                              icon={key === "express" ? "heroicons:bolt" : "heroicons:truck"}
                              className="w-5 h-5 text-gray-700"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {priceState?.loading ? (
                            <>
                              <Skeleton className="h-4 w-24 mb-2" />
                              <Skeleton className="h-3 w-20" />
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-gray-900">
                                {key === "express" && priceState?.carrier && RECOMMANDE_CARRIERS.has(priceState.carrier)
                                  ? "Recommandé"
                                  : t(`form.delivery.modal.option.${key}.title`)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {t(`form.delivery.modal.option.${key}.delay`, { days: displayDays })}
                              </p>
                              {priceState?.carrier && CARRIER_INFO[priceState.carrier] && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  via {CARRIER_INFO[priceState.carrier].name}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {priceState?.loading ? (
                          <Skeleton className="h-4 w-12" />
                        ) : (
                          <span className="text-sm font-bold text-gray-900 min-w-[3rem] text-right">
                            {displayPrice}
                          </span>
                        )}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-black" : "border-gray-300"
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 rounded-b-2xl flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {t("form.delivery.modal.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedOption ? dynamicPrices[selectedOption]?.loading : false}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-black rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("form.delivery.modal.confirm")}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

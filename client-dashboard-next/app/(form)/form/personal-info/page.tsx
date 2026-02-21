"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { createClient } from "@/lib/supabase/client";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useTranslation } from "@/hooks/useTranslation";
import AddressAutocomplete from "@/components/form/AddressAutocomplete";

export default function PersonalInfoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formData, updateFormData } = useFormData();
  const { registerContinueHandler } = useFormActions();
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailExists, setEmailExists] = useState(false);
  const [phoneDefaultCountry, setPhoneDefaultCountry] = useState<string | undefined>("FR");

  const handleChange = (field: string, value: string) => {
    updateFormData({ [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (field === "email" && emailExists) setEmailExists(false);
  };

  const handleAddressSelect = useCallback(
    (addressData: { formatted_address?: string; address?: string; city?: string; postal_code?: string; country?: string; timezone?: string }) => {
      updateFormData({
        address: addressData.formatted_address || addressData.address || "",
        city: addressData.city || "",
        postalCode: addressData.postal_code || "",
        country: addressData.country || "",
        timezone: addressData.timezone || "",
      });
    },
    [updateFormData]
  );

  const checkEmailExists = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    try {
      const supabase = createClient();
      const { data } = await supabase.from("client").select("id").eq("email", email).maybeSingle();
      setEmailExists(!!data);
    } catch {
      setEmailExists(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) checkEmailExists(formData.email);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.email]);

  useEffect(() => {
    const cached = localStorage.getItem("notaryPhoneCountry");
    if (cached) {
      setPhoneDefaultCountry(cached);
      return;
    }
    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .then((data) => {
        const code = data?.country_code?.toUpperCase();
        if (code?.length === 2) {
          setPhoneDefaultCountry(code);
          localStorage.setItem("notaryPhoneCountry", code);
        }
      })
      .catch(() => setPhoneDefaultCountry("FR"));
  }, []);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName?.trim()) newErrors.firstName = t("form.steps.personalInfo.validationFirstName");
    if (!formData.lastName?.trim()) newErrors.lastName = t("form.steps.personalInfo.validationLastName");
    if (!formData.email?.trim()) {
      newErrors.email = t("form.steps.personalInfo.validationEmail");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("form.steps.personalInfo.validationEmailInvalid");
    }
    if (!formData.address?.trim()) newErrors.address = t("form.steps.personalInfo.validationAddress");
    if (!formData.phone?.trim()) {
      newErrors.phone = t("form.steps.personalInfo.validationPhone");
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = t("form.steps.personalInfo.validationPhoneInvalid");
    }
    if (emailExists) newErrors.email = t("form.steps.personalInfo.emailExists");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, emailExists, t]);

  const handleNext = useCallback(() => {
    if (!validate()) return;
    const search = searchParams.toString();
    const query = search ? `?${search}` : "";
    if ((formData.selectedServices?.length ?? 0) > 0) {
      router.push(`/form/documents${query}`);
    } else {
      router.push(`/form/choose-services${query}`);
    }
  }, [validate, router, searchParams, formData.selectedServices]);

  useEffect(() => {
    registerContinueHandler(handleNext);
  }, [registerContinueHandler, handleNext]);

  const inputClass = (err: boolean) =>
    `w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400 placeholder:italic ${
      err ? "border-red-500" : "border-gray-200"
    }`;

  return (
    <>
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-36 md:pb-6 lg:pb-6"
        style={{ minHeight: 0 }}
      >
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t("form.steps.personalInfo.title")}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">{t("form.steps.personalInfo.subtitle")}</p>
          </div>

          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
              <div>
                <label htmlFor="firstName" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                  <Icon icon="heroicons:user" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                  <span>
                    {t("form.steps.personalInfo.firstName")} <span className="text-red-500 ml-1">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName || ""}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className={inputClass(!!errors.firstName)}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                    <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                    <span>{errors.firstName}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                  <Icon icon="heroicons:user" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                  <span>
                    {t("form.steps.personalInfo.lastName")} <span className="text-red-500 ml-1">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName || ""}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className={inputClass(!!errors.lastName)}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                    <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                    <span>{errors.lastName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                <Icon icon="heroicons:envelope" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                <span>
                  {t("form.steps.personalInfo.email")} <span className="text-red-500 ml-1">*</span>
                </span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={(e) => checkEmailExists(e.target.value)}
                className={`${inputClass(!!errors.email || emailExists)} ${!formData.email ? "placeholder:text-gray-400 placeholder:italic" : ""}`}
                placeholder="john.doe@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
              {emailExists && !errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-start">
                  <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5" />
                  <span className="break-words">{t("form.steps.personalInfo.emailExists")}</span>
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                <Icon icon="heroicons:phone" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                <span>
                  {t("form.steps.personalInfo.phone")} <span className="text-red-500 ml-1">*</span>
                </span>
              </label>
              <div
                className={`flex items-center bg-white border-2 rounded-xl overflow-hidden transition-all focus-within:ring-2 pl-2 sm:pl-3 pr-2 sm:pr-3 ${
                  errors.phone
                    ? "border-red-500 focus-within:ring-red-500 focus-within:border-red-500"
                    : "border-gray-200 focus-within:ring-black focus-within:border-black"
                }`}
              >
                <PhoneInput
                  international
                  defaultCountry={phoneDefaultCountry as "FR" | "US" | undefined}
                  value={formData.phone || ""}
                  onChange={(value) => handleChange("phone", value || "")}
                  className="phone-input-integrated w-full flex text-sm sm:text-base"
                  countrySelectProps={{
                    className:
                      "pr-1 sm:pr-2 py-2.5 sm:py-3 border-0 outline-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors rounded-none text-xs sm:text-sm focus:outline-none focus:ring-0",
                  }}
                  numberInputProps={{
                    className: "flex-1 pl-1 sm:pl-2 py-2.5 sm:py-3 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm sm:text-base",
                  }}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2 flex items-center">
                <Icon icon="heroicons:map-pin" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-gray-400 flex-shrink-0" />
                <span>
                  {t("form.steps.personalInfo.address")} <span className="text-red-500 ml-1">*</span>
                </span>
              </label>
              <AddressAutocomplete
                value={formData.address || ""}
                onChange={(value) => handleChange("address", value)}
                onAddressSelect={handleAddressSelect}
                placeholder={t("form.steps.personalInfo.placeholderAddress")}
                className={errors.address ? "border-red-500" : ""}
              />
              {errors.address && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span>{errors.address}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

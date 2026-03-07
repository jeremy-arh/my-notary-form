"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { createClient } from "@/lib/supabase/client";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useTranslation } from "@/hooks/useTranslation";
import AddressAutocomplete from "@/components/form/AddressAutocomplete";
import { getResumePath } from "@/lib/formResume";
import { initialFormData } from "@/lib/formData";

const STORAGE_KEY = "notaryFormData";
const SESSION_KEY = "formSessionId";

export default function PersonalInfoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formData, updateFormData } = useFormData();
  const { registerContinueHandler, registerStepValidationOverride } = useFormActions();
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailExists, setEmailExists] = useState(false);
  const [emailExistsAttempted, setEmailExistsAttempted] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phoneDefaultCountry, setPhoneDefaultCountry] = useState<string | undefined>("FR");
  const handleChange = (field: string, value: string) => {
    updateFormData({ [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (field === "email") {
      if (emailExists) setEmailExists(false);
      if (emailExistsAttempted) setEmailExistsAttempted(false);
      if (magicLinkSent) setMagicLinkSent(false);
    }
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

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsLoggedIn(false);
    } catch {
      /* ignore */
    }
  };

  const handleSendMagicLink = async () => {
    const email = formData.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSendingMagicLink(true);
    setErrors((prev) => ({ ...prev, email: "" }));
    try {
      const supabase = createClient();
      const nextPath = `/form/personal-info${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        email: err instanceof Error ? err.message : t("form.steps.personalInfo.magicLinkError"),
      }));
    } finally {
      setSendingMagicLink(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Quand connecté : charger le profil client et mettre à jour le formulaire (toujours les infos à jour)
  useEffect(() => {
    if (!isLoggedIn) return;
    const supabase = createClient();
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      const { data: client } = await supabase
        .from("client")
        .select("first_name, last_name, email, phone, address, city, postal_code, country")
        .eq("user_id", user.id)
        .maybeSingle();
      if (client) {
        updateFormData({
          firstName: client.first_name ?? "",
          lastName: client.last_name ?? "",
          email: client.email ?? user.email ?? "",
          phone: client.phone ?? "",
          address: client.address ?? "",
          city: client.city ?? "",
          postalCode: client.postal_code ?? "",
          country: client.country ?? "",
        });
      }
    };
    loadProfile();
  }, [isLoggedIn, updateFormData]);

  useEffect(() => {
    if (isLoggedIn) return;
    const timer = setTimeout(() => {
      if (formData.email) checkEmailExists(formData.email);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.email, isLoggedIn]);

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

  const isFormValid = useCallback(() => {
    if (!formData.firstName?.trim()) return false;
    if (!formData.lastName?.trim()) return false;
    if (!formData.email?.trim()) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return false;
    if (!formData.address?.trim()) return false;
    if (!formData.phone?.trim()) return false;
    if (!isValidPhoneNumber(formData.phone)) return false;
    if (!isLoggedIn && emailExists) return false;
    return true;
  }, [formData, emailExists, isLoggedIn]);

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
    setErrors(newErrors);
    if (!isLoggedIn && emailExists) {
      setEmailExistsAttempted(true);
      return false;
    }
    return Object.keys(newErrors).length === 0;
  }, [formData, emailExists, isLoggedIn, t]);

  const navigateNext = useCallback(() => {
    const search = searchParams.toString();
    const query = search ? `?${search}` : "";
    const hasServiceInUrl = searchParams.has("service");
    if (hasServiceInUrl) {
      router.push(`/form/documents${query}`);
    } else {
      router.push(`/form/choose-services${query}`);
    }
  }, [router, searchParams]);

  const handleNext = useCallback(async () => {
    if (!validate()) return;

    const email = formData.email?.trim();
    if (!email) { navigateNext(); return; }

    // Vérifier si une soumission en cours existe pour cet email (cross-device/session)
    const currentSubmissionId = (() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) return (JSON.parse(raw) as { submissionId?: string }).submissionId;
      } catch { /* ignore */ }
      return undefined;
    })();

    try {
      const res = await fetch(`/api/active-submission?email=${encodeURIComponent(email)}`);
      const { formData: dbFd, submission } = await res.json();
      if (submission && submission.id !== currentSubmissionId) {
        const fd = dbFd as Record<string, unknown>;
        const sessionId = (submission.data?.session_id as string) ?? "";
        const { sessionId: _s, submissionId: _si, ...rest } = fd;
        const toApply = { ...initialFormData, ...rest, submissionId: submission.id };
        updateFormData(toApply);
        const serialized = JSON.stringify({ ...rest, submissionId: submission.id });
        window.localStorage.setItem(STORAGE_KEY, serialized);
        if (sessionId) window.localStorage.setItem(SESSION_KEY, sessionId);
        const path = getResumePath(toApply as typeof initialFormData);
        const search = searchParams.toString();
        router.replace(search ? `${path}?${search}` : path);
        return;
      }
    } catch { /* ignore, continuer */ }

    navigateNext();
  }, [validate, formData.email, navigateNext, router, searchParams, updateFormData]);

  useEffect(() => {
    registerContinueHandler(handleNext);
  }, [registerContinueHandler, handleNext]);

  useEffect(() => {
    const unregister = registerStepValidationOverride("/form/personal-info", () => {
      if (!isLoggedIn && emailExists) return { isComplete: false, errorKey: "form.steps.personalInfo.emailExists" };
      if (!isFormValid()) return { isComplete: false, errorKey: "form.steps.personalInfo.stepHint" };
      return { isComplete: true, errorKey: "" };
    });
    return unregister;
  }, [registerStepValidationOverride, isFormValid, emailExists, isLoggedIn]);

  const inputClass = (err: boolean, disabled?: boolean) =>
    `w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-xl transition-all text-sm sm:text-base ${
      disabled
        ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
        : err
          ? "bg-white border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder:text-gray-400 placeholder:italic"
          : "bg-white border-gray-200 focus:ring-2 focus:ring-black focus:border-black placeholder:text-gray-400 placeholder:italic"
    }`;

  return (
    <>
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-28 sm:pb-32 md:pb-28 lg:pb-28"
        style={{ minHeight: 0 }}
      >
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {t("form.steps.personalInfo.title")}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">{t("form.steps.personalInfo.subtitle")}</p>
          </div>

          {isLoggedIn && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs sm:text-sm text-gray-600">
                {t("form.steps.personalInfo.editFromAccount")}
              </p>
              <a
                href="/dashboard/profile"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline shrink-0"
              >
                {t("form.steps.personalInfo.openAccount")}
                <Icon icon="heroicons:arrow-top-right-on-square" className="w-4 h-4" />
              </a>
            </div>
          )}

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
                  onChange={(e) => !isLoggedIn && handleChange("firstName", e.target.value)}
                  readOnly={isLoggedIn}
                  className={inputClass(!!errors.firstName, isLoggedIn)}
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
                  onChange={(e) => !isLoggedIn && handleChange("lastName", e.target.value)}
                  readOnly={isLoggedIn}
                  className={inputClass(!!errors.lastName, isLoggedIn)}
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
              {isLoggedIn ? (
                <div className={`flex items-center gap-2 rounded-xl border-2 overflow-hidden ${errors.email ? "border-red-500" : "border-gray-200"}`}>
                  <input
                    type="email"
                    id="email"
                    value={formData.email || ""}
                    readOnly
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 border-0 text-sm sm:text-base focus:ring-0 focus:outline-none cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="shrink-0 mr-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300 rounded-lg transition-colors"
                  >
                    {t("form.steps.personalInfo.logout")}
                  </button>
                </div>
              ) : (
                <input
                  type="email"
                  id="email"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={(e) => checkEmailExists(e.target.value)}
                  className={`${inputClass(!!errors.email)} ${!formData.email ? "placeholder:text-gray-400 placeholder:italic" : ""}`}
                  placeholder="john.doe@example.com"
                />
              )}
              {errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                  <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
              {!isLoggedIn && emailExists && (
                <div className={`mt-2 p-3 rounded-xl transition-colors ${
                  magicLinkSent
                    ? "bg-emerald-50 border border-emerald-200"
                    : emailExistsAttempted
                      ? "bg-red-50 border border-red-300"
                      : "bg-gray-50 border border-gray-200"
                }`}>
                  {magicLinkSent ? (
                    <p className="text-sm text-emerald-800 flex items-center gap-2">
                      <Icon icon="heroicons:check-circle" className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                      {t("form.steps.personalInfo.magicLinkSent")}
                    </p>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className={`text-sm ${emailExistsAttempted ? "text-red-700 font-medium" : "text-gray-600"}`}>
                        {t("form.steps.personalInfo.emailExistsMagicLink")}
                      </p>
                      <button
                        type="button"
                        onClick={handleSendMagicLink}
                        disabled={sendingMagicLink}
                        className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          emailExistsAttempted
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                      >
                        {sendingMagicLink ? t("form.steps.personalInfo.sendingMagicLink") : t("form.steps.personalInfo.sendMagicLink")}
                      </button>
                    </div>
                  )}
                </div>
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
              {isLoggedIn ? (
                <input
                  type="text"
                  id="phone"
                  value={formData.phone || ""}
                  readOnly
                  className={inputClass(!!errors.phone, true)}
                />
              ) : (
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
              )}
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
              {isLoggedIn ? (
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-sm sm:text-base text-gray-600 cursor-not-allowed">
                  {[formData.address, formData.city, formData.postalCode, formData.country].filter(Boolean).join(", ") || "—"}
                </div>
              ) : (
                <AddressAutocomplete
                  value={formData.address || ""}
                  onChange={(value) => handleChange("address", value)}
                  onAddressSelect={handleAddressSelect}
                  placeholder={t("form.steps.personalInfo.placeholderAddress")}
                  className={errors.address ? "border-red-500" : ""}
                />
              )}
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

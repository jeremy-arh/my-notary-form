"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useFormData } from "@/contexts/FormContext";
import { useFormActions } from "@/contexts/FormActionsContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { formatPriceSync, convertPriceRoundUpSync } from "@/lib/utils/currency";
import { ADDITIONAL_SIGNATORY_PRICE_EUR } from "@/lib/utils/pricing";

type Signatory = {
  id?: number;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthCity?: string;
  postalAddress?: string;
  email?: string;
  phone?: string;
  _isNew?: boolean;
};

export default function SignatoriesPage() {
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { registerContinueHandler } = useFormActions();
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [phoneErrors, setPhoneErrors] = useState<Record<number, string>>({});
  const [emailErrors, setEmailErrors] = useState<Record<number, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const userAutoAddedRef = useRef(false);

  const isUserSignatory = useCallback(
    (sig: Signatory) =>
      sig?.email === formData.email &&
      sig?.firstName === formData.firstName?.trim() &&
      sig?.lastName === formData.lastName?.trim(),
    [formData.email, formData.firstName, formData.lastName]
  );

  useEffect(() => {
    const hasUserInfo =
      formData.firstName?.trim() &&
      formData.lastName?.trim() &&
      formData.email?.trim();
    if (!hasUserInfo) return;

    const currentSignatories = (formData.signatories || []) as Signatory[];
    const userAsSignatory: Signatory = {
      id: Date.now(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      birthDate: "",
      birthCity: "",
      postalAddress: formData.address || "",
      email: formData.email.trim(),
      phone: formData.phone?.trim() || "",
    };

    if (currentSignatories.length === 0) {
      if (!userAutoAddedRef.current) {
        userAutoAddedRef.current = true;
        updateFormData({ signatories: [userAsSignatory], isSignatory: true });
      }
      return;
    }

    const firstIsUser = isUserSignatory(currentSignatories[0]);
    if (!firstIsUser) {
      const userIndex = currentSignatories.findIndex(isUserSignatory);
      let newSignatories: Signatory[];
      if (userIndex >= 0) {
        newSignatories = [
          { ...currentSignatories[userIndex], ...userAsSignatory },
          ...currentSignatories.filter((_, i) => i !== userIndex),
        ];
      } else {
        newSignatories = [userAsSignatory, ...currentSignatories];
      }
      updateFormData({ signatories: newSignatories, isSignatory: true });
    } else {
      const first = currentSignatories[0];
      const hasEssentialChanges =
        first.firstName !== formData.firstName?.trim() ||
        first.lastName !== formData.lastName?.trim() ||
        first.email !== formData.email?.trim() ||
        first.phone !== (formData.phone?.trim() || "");
      if (hasEssentialChanges) {
        updateFormData({
          signatories: [
            { ...first, ...userAsSignatory },
            ...currentSignatories.slice(1),
          ],
          isSignatory: true,
        });
      }
    }
  }, [
    formData.firstName,
    formData.lastName,
    formData.email,
    formData.phone,
    formData.address,
    isUserSignatory,
    updateFormData,
  ]);

  useEffect(() => {
    const data = formData.signatories;
    if (data && Array.isArray(data)) {
      setSignatories(data as Signatory[]);
    } else if (!data || (data as unknown[]).length === 0) {
      if (signatories.length > 0) setSignatories([]);
    }
  }, [formData.signatories]);

  const updateSignatoryField = useCallback(
    (signatoryIndex: number, field: keyof Signatory, value: string) => {
      const updated = [...signatories];
      if (!updated[signatoryIndex]) {
        updated[signatoryIndex] = {
          id: Date.now() + signatoryIndex,
          firstName: "",
          lastName: "",
          birthDate: "",
          birthCity: "",
          postalAddress: "",
          email: "",
          phone: "",
        };
      }
      (updated[signatoryIndex] as Record<string, unknown>)[field] = value;
      setSignatories(updated);
      setShowValidationError(false);

      if (field === "phone") {
        const errorKey = signatoryIndex;
        if (value && value.length > 3) {
          setPhoneErrors((prev) =>
            !isValidPhoneNumber(value)
              ? { ...prev, [errorKey]: t("form.steps.signatories.validationPhoneInvalid") }
              : (() => {
                  const next = { ...prev };
                  delete next[errorKey];
                  return next;
                })()
          );
        } else {
          setPhoneErrors((prev) => {
            const next = { ...prev };
            delete next[errorKey];
            return next;
          });
        }
      }
      if (field === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errorKey = signatoryIndex;
        if (value && value.trim()) {
          setEmailErrors((prev) =>
            !emailRegex.test(value.trim())
              ? { ...prev, [errorKey]: t("form.steps.signatories.validationEmailInvalid") }
              : (() => {
                  const next = { ...prev };
                  delete next[errorKey];
                  return next;
                })()
          );
        } else {
          setEmailErrors((prev) => {
            const next = { ...prev };
            delete next[errorKey];
            return next;
          });
        }
      }
      updateFormData({ signatories: updated });
    },
    [signatories, t, updateFormData]
  );

  const addSignatory = useCallback(() => {
    const newSignatory: Signatory = {
      id: Date.now(),
      firstName: "",
      lastName: "",
      birthDate: "",
      birthCity: "",
      postalAddress: "",
      email: "",
      phone: "",
      _isNew: true,
    };
    const updated = [...signatories, newSignatory];
    setSignatories(updated);
    updateFormData({ signatories: updated });
    setEditingIndex(updated.length - 1);
  }, [signatories, updateFormData]);

  const removeSignatory = useCallback(
    (signatoryIndex: number) => {
      const updated = signatories.filter((_, i) => i !== signatoryIndex);
      setSignatories(updated);
      updateFormData({ signatories: updated });
      if (editingIndex === signatoryIndex) setEditingIndex(null);
      else if (editingIndex !== null && editingIndex > signatoryIndex)
        setEditingIndex(editingIndex - 1);
      setPhoneErrors((prev) => {
        const next = { ...prev };
        delete next[signatoryIndex];
        Object.keys(next).forEach((k) => {
          const idx = parseInt(k, 10);
          if (idx > signatoryIndex) {
            next[idx - 1] = next[idx];
            delete next[idx];
          }
        });
        return next;
      });
      setEmailErrors((prev) => {
        const next = { ...prev };
        delete next[signatoryIndex];
        Object.keys(next).forEach((k) => {
          const idx = parseInt(k, 10);
          if (idx > signatoryIndex) {
            next[idx - 1] = next[idx];
            delete next[idx];
          }
        });
        return next;
      });
    },
    [signatories, editingIndex, updateFormData]
  );

  const validate = useCallback(() => {
    // Utiliser les signataires locaux (état le plus à jour) ou formData
    const all = signatories.length > 0 ? signatories : (formData.signatories as Signatory[] || []);
    // Ne valider que les signataires "enregistrés" (sans _isNew) pour éviter les faux négatifs
    const toValidate = all.filter((s) => !(s as Signatory)._isNew);
    if (!toValidate || toValidate.length === 0) return false;
    for (let i = 0; i < toValidate.length; i++) {
      const sig = toValidate[i] as Signatory;
      if (!sig) return false;
      const fn = sig.firstName?.trim();
      const ln = sig.lastName?.trim();
      const em = sig.email?.trim();
      const ph = sig.phone?.trim();
      if (!fn || !ln || !em || !ph) return false;
      // Normaliser le téléphone (supprimer espaces) pour la validation
      const phoneNormalized = ph.replace(/\s/g, "");
      if (!isValidPhoneNumber(phoneNormalized)) return false;
    }
    return true;
  }, [formData.signatories, signatories]);

  const handleNext = useCallback(() => {
    if (validate()) {
      setShowValidationError(false);
      // Retirer les signataires _isNew incomplets avant la navigation
      const cleaned = signatories.filter(
        (s) =>
          !(s as Signatory)._isNew ||
          ((s.firstName?.trim() && s.lastName?.trim() && s.email?.trim() && s.phone?.trim()) ?? false)
      );
      if (cleaned.length !== signatories.length) {
        updateFormData({ signatories: cleaned });
      }
      router.push("/form/delivery");
    } else {
      setShowValidationError(true);
    }
  }, [validate, router, signatories, updateFormData]);

  useEffect(() => {
    registerContinueHandler(handleNext);
  }, [registerContinueHandler, handleNext]);

  const isValid = useMemo(() => validate(), [validate]);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-32 sm:pb-36 md:pb-6 lg:pb-6"
      style={{ minHeight: 0 }}
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
            {t("form.steps.signatories.title")}
          </h2>
          {showValidationError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <Icon icon="heroicons:exclamation-circle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                {t("form.steps.signatories.validationError")}
              </p>
            </div>
          )}
          <p className="text-xs sm:text-sm text-gray-600">
            {t("form.steps.signatories.subtitle")}
            {signatories.length > 1 && (
              <span className="block mt-1">
                {t("form.steps.signatories.firstSignatoryIncluded")}{" "}
                {formatPriceSync(convertPriceRoundUpSync(ADDITIONAL_SIGNATORY_PRICE_EUR, currency), currency)}.
              </span>
            )}
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {signatories.map((signatory, signatoryIndex) => {
            if (signatory._isNew && editingIndex !== signatoryIndex) return null;

            return editingIndex === signatoryIndex ? (
              <div
                key={signatory.id || signatoryIndex}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    {t("form.steps.signatories.editSignatory")} {signatoryIndex + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (signatory._isNew) removeSignatory(signatoryIndex);
                      setEditingIndex(null);
                    }}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Cancel editing"
                  >
                    <Icon icon="heroicons:x-mark" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      {t("form.steps.signatories.firstName")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={signatory.firstName || ""}
                      onChange={(e) =>
                        updateSignatoryField(signatoryIndex, "firstName", e.target.value)
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-gray-400 placeholder:italic"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      {t("form.steps.signatories.lastName")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={signatory.lastName || ""}
                      onChange={(e) =>
                        updateSignatoryField(signatoryIndex, "lastName", e.target.value)
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-gray-400 placeholder:italic"
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      {t("form.steps.signatories.email")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={signatory.email || ""}
                      onChange={(e) =>
                        updateSignatoryField(signatoryIndex, "email", e.target.value)
                      }
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border rounded-lg focus:ring-2 text-sm placeholder:text-gray-400 placeholder:italic ${
                        emailErrors[signatoryIndex]
                          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                      }`}
                      placeholder={t("form.steps.signatories.placeholderEmail")}
                    />
                    {emailErrors[signatoryIndex] && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span>{emailErrors[signatoryIndex]}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                      {t("form.steps.signatories.phone")} <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`flex items-center bg-white border ${
                        phoneErrors[signatoryIndex] ? "border-red-500" : "border-gray-300"
                      } rounded-lg overflow-hidden transition-all focus-within:ring-2 ${
                        phoneErrors[signatoryIndex]
                          ? "focus-within:ring-red-500 focus-within:border-red-500"
                          : "focus-within:ring-indigo-500"
                      } pl-2 sm:pl-3 pr-2 sm:pr-3`}
                    >
                      <PhoneInput
                        international
                        defaultCountry="FR"
                        value={signatory.phone || ""}
                        onChange={(value) =>
                          updateSignatoryField(signatoryIndex, "phone", value || "")
                        }
                        className="phone-input-integrated w-full flex text-sm"
                        countrySelectProps={{
                          className:
                            "pr-1 sm:pr-2 py-2 sm:py-2.5 border-0 outline-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors rounded-none text-xs sm:text-sm focus:outline-none focus:ring-0",
                        }}
                        numberInputProps={{
                          className:
                            "flex-1 pl-1 sm:pl-2 py-2 sm:py-2.5 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm",
                        }}
                      />
                    </div>
                    {phoneErrors[signatoryIndex] && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <Icon icon="heroicons:exclamation-circle" className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span>{phoneErrors[signatoryIndex]}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const hasBasicInfo =
                        signatory.firstName?.trim() ||
                        signatory.lastName?.trim() ||
                        signatory.email?.trim();
                      if (hasBasicInfo) {
                        const updated = [...signatories];
                        if (updated[signatoryIndex]) {
                          delete updated[signatoryIndex]._isNew;
                          setSignatories(updated);
                          updateFormData({ signatories: updated });
                        }
                        setEditingIndex(null);
                      } else {
                        if (signatory._isNew) removeSignatory(signatoryIndex);
                        setEditingIndex(null);
                      }
                    }}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-black text-white font-medium rounded-lg transition-colors hover:bg-gray-800 text-sm flex items-center gap-2"
                  >
                    <Icon icon="heroicons:check" className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{t("form.steps.signatories.saveChanges")}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={signatory.id || signatoryIndex}
                className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm sm:text-base">
                        {getInitials(signatory.firstName, signatory.lastName)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {signatory.firstName} {signatory.lastName}
                        {isUserSignatory(signatory) && (
                          <span className="ml-2 text-xs text-gray-500 font-normal">
                            {t("form.steps.signatories.youLabel")}
                          </span>
                        )}
                        {signatoryIndex > 0 && (
                          <span className="ml-2 text-xs text-orange-600 font-medium">
                            (+{formatPriceSync(convertPriceRoundUpSync(ADDITIONAL_SIGNATORY_PRICE_EUR, currency), currency)})
                          </span>
                        )}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
                        {signatory.email || t("form.steps.signatories.noEmail")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(signatoryIndex)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Edit signatory"
                    >
                      <Icon icon="heroicons:pencil" className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    </button>
                    {!(signatoryIndex === 0 && isUserSignatory(signatory)) && (
                      <button
                        type="button"
                        onClick={() => removeSignatory(signatoryIndex)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        aria-label="Remove signatory"
                      >
                        <Icon icon="heroicons:trash" className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {!(editingIndex !== null && signatories[editingIndex]?._isNew) && (
            <button
              type="button"
              onClick={addSignatory}
              className="w-full bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    {t("form.steps.signatories.addSignatory")}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {signatories.length === 0
                      ? t("form.steps.signatories.addAnotherSignatory")
                      : `${t("form.steps.signatories.addAnotherSignatory")} (+${formatPriceSync(convertPriceRoundUpSync(ADDITIONAL_SIGNATORY_PRICE_EUR, currency), currency)})`}
                  </p>
                </div>
                <Icon icon="heroicons:plus" className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 flex-shrink-0" />
              </div>
            </button>
          )}

          {signatories.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">{t("form.steps.signatories.noSignatoriesYet")}</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <Icon icon="heroicons:information-circle" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <p className="text-xs sm:text-sm text-blue-900 break-words leading-relaxed">
              {t("form.steps.signatories.infoBlockTextPart1")}
            </p>
            <p className="text-xs sm:text-sm text-blue-900 break-words leading-relaxed">
              {t("form.steps.signatories.infoBlockTextPart2")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

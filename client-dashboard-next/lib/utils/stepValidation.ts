import { isValidPhoneNumber } from "react-phone-number-input";
import type { FormData } from "@/lib/formData";

export type StepValidationResult = {
  isComplete: boolean;
  errorKey: string;
};

function isPersonalInfoComplete(formData: FormData): StepValidationResult {
  const fn = formData.firstName?.trim();
  const ln = formData.lastName?.trim();
  const email = formData.email?.trim();
  const address = formData.address?.trim();
  const phone = formData.phone?.trim();

  if (!fn) return { isComplete: false, errorKey: "form.steps.personalInfo.stepHint" };
  if (!ln) return { isComplete: false, errorKey: "form.steps.personalInfo.stepHint" };
  if (!email) return { isComplete: false, errorKey: "form.steps.personalInfo.stepHint" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { isComplete: false, errorKey: "form.steps.personalInfo.stepHint" };
  if (!address) return { isComplete: false, errorKey: "form.steps.personalInfo.stepHint" };
  if (!phone) return { isComplete: false, errorKey: "form.steps.personalInfo.stepHint" };
  if (!isValidPhoneNumber(phone)) return { isComplete: false, errorKey: "form.steps.personalInfo.stepHint" };

  return { isComplete: true, errorKey: "" };
}

function isChooseServicesComplete(formData: FormData): StepValidationResult {
  const count = formData.selectedServices?.length ?? 0;
  if (count === 0) return { isComplete: false, errorKey: "form.steps.chooseOption.stepHint" };
  return { isComplete: true, errorKey: "" };
}

function isDocumentsComplete(
  formData: FormData,
  isUploading: boolean
): StepValidationResult {
  if (isUploading) return { isComplete: false, errorKey: "form.steps.documents.stepHintUploading" };

  const services = formData.selectedServices ?? [];
  const docs = formData.serviceDocuments ?? {};

  if (services.length === 0) return { isComplete: false, errorKey: "form.steps.documents.stepHint" };

  for (const sid of services) {
    const files = (docs[sid] as unknown[] | undefined) ?? [];
    if (files.length === 0) return { isComplete: false, errorKey: "form.steps.documents.stepHint" };
  }

  return { isComplete: true, errorKey: "" };
}

type Signatory = { firstName?: string; lastName?: string; email?: string; phone?: string };

function isSignatoriesComplete(formData: FormData): StepValidationResult {
  const signatories = (formData.signatories ?? []) as Signatory[];
  if (signatories.length === 0) return { isComplete: false, errorKey: "form.steps.signatories.stepHint" };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const sig of signatories) {
    const fn = (sig.firstName ?? "").trim();
    const ln = (sig.lastName ?? "").trim();
    const email = (sig.email ?? "").trim();
    const phone = (sig.phone ?? "").replace(/\s/g, "");

    if (!fn || !ln || !email || !phone)
      return { isComplete: false, errorKey: "form.steps.signatories.stepHint" };
    if (!emailRegex.test(email)) return { isComplete: false, errorKey: "form.steps.signatories.stepHint" };
    if (!isValidPhoneNumber(phone)) return { isComplete: false, errorKey: "form.steps.signatories.stepHint" };
  }

  return { isComplete: true, errorKey: "" };
}

function isDeliveryComplete(formData: FormData): StepValidationResult {
  if (!formData.deliveryMethod?.trim()) return { isComplete: false, errorKey: "form.steps.delivery.stepHint" };
  return { isComplete: true, errorKey: "" };
}

function isSummaryComplete(formData: FormData): StepValidationResult {
  const totalDocs =
    formData.selectedServices?.reduce((total, sid) => {
      const docs = formData.serviceDocuments?.[sid] as unknown[] | undefined;
      return total + (docs?.length ?? 0);
    }, 0) ?? 0;

  const hasSignatories =
    formData.signatories && Array.isArray(formData.signatories) && formData.signatories.length > 0;

  const personalOk = !!(
    formData.firstName?.trim() &&
    formData.lastName?.trim() &&
    formData.email?.trim()
  );
  const servicesOk = (formData.selectedServices?.length ?? 0) > 0;
  const docsOk = totalDocs > 0;
  const signatoriesOk = !!hasSignatories;
  const deliveryOk = !!formData.deliveryMethod;

  if (!personalOk) return { isComplete: false, errorKey: "form.steps.summary.stepHint" };
  if (!servicesOk) return { isComplete: false, errorKey: "form.steps.summary.stepHint" };
  if (!docsOk) return { isComplete: false, errorKey: "form.steps.summary.stepHint" };
  if (!signatoriesOk) return { isComplete: false, errorKey: "form.steps.summary.stepHint" };
  if (!deliveryOk) return { isComplete: false, errorKey: "form.steps.summary.stepHint" };

  return { isComplete: true, errorKey: "" };
}

export function getStepValidation(
  pathname: string,
  formData: FormData,
  isUploading: boolean
): StepValidationResult {
  switch (pathname) {
    case "/form/personal-info":
      return isPersonalInfoComplete(formData);
    case "/form/choose-services":
      return isChooseServicesComplete(formData);
    case "/form/documents":
      return isDocumentsComplete(formData, isUploading);
    case "/form/signatories":
      return isSignatoriesComplete(formData);
    case "/form/delivery":
      return isDeliveryComplete(formData);
    case "/form/summary":
      return isSummaryComplete(formData);
    default:
      return { isComplete: true, errorKey: "" };
  }
}

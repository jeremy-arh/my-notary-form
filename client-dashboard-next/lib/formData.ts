export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  timezone: string;
  notes?: string;
  selectedServices: string[];
  serviceDocuments: Record<string, unknown[]>;
  deliveryMethod: string | null;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  deliveryCountry?: string;
  deliveryOption?: "standard" | "express" | null;
  deliveryPriceEUR?: number;
  usePersonalAddressForDelivery?: boolean;
  signatories: unknown[];
  isSignatory: boolean;
  currency: string;
  gclid?: string;
  [key: string]: unknown;
}

export const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  timezone: "",
  notes: "",
  selectedServices: [],
  serviceDocuments: {},
  deliveryMethod: null,
  signatories: [],
  isSignatory: false,
  currency: "EUR",
};

"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (input: HTMLInputElement, opts: { types?: string[]; fields?: string[] }) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => {
              geometry?: { location: { lat: () => number; lng: () => number } };
              address_components?: Array<{ long_name: string; types: string[] }>;
              formatted_address?: string;
            };
          };
        };
      };
    };
  }
}

export interface AddressData {
  formatted_address: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (data: AddressData) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter address...",
  className = "",
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value || "");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "");
    }
  }, [value]);

  useEffect(() => {
    if (!containerRef.current) return;
    const input = containerRef.current.querySelector("input");
    if (!input) return;
    if (placeholder && input.placeholder !== placeholder) {
      input.placeholder = placeholder;
    }
    const val = value || "";
    if (input.value !== val) {
      input.value = val;
      setInputValue(val);
    }
  }, [placeholder, value]);

  const getTimezoneFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    if (!apiKey) throw new Error("Google Maps API key not configured");

    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${timestamp}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.timeZoneId) {
      return data.timeZoneId;
    }
    throw new Error(data.errorMessage || "Failed to get timezone");
  };

  const initializeAutocomplete = () => {
    if (!containerRef.current || !window.google?.maps?.places) {
      setTimeout(() => {
        if (containerRef.current && window.google?.maps?.places) {
          initializeAutocomplete();
        }
      }, 100);
      return;
    }

    try {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = placeholder;
      const borderColor = className.includes("border-red-500") ? "border-red-500" : "border-gray-200";
      const baseClasses =
        "w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400 placeholder:italic";
      input.className = `${baseClasses} ${borderColor}`.trim();
      input.classList.add("address-autocomplete-input");
      if (inputValue) input.value = inputValue;

      if (!document.getElementById("address-autocomplete-placeholder-style")) {
        const style = document.createElement("style");
        style.id = "address-autocomplete-placeholder-style";
        style.textContent = `
          .address-autocomplete-input::placeholder {
            color: #9ca3af !important;
            font-style: italic !important;
          }
        `;
        document.head.appendChild(style);
      }

      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(input);

      const Autocomplete = window.google!.maps!.places!.Autocomplete;
      const autocomplete = new Autocomplete(input, {
        types: ["address"],
        fields: ["address_components", "geometry", "formatted_address", "place_id"],
      });

      input.addEventListener("input", (e: Event) => {
        const newValue = (e.target as HTMLInputElement).value;
        setInputValue(newValue);
        onChange(newValue);
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.address_components) {
          setError("No address details available for this place.");
          return;
        }

        setIsLoading(true);

        const addressData: AddressData = {
          formatted_address: place.formatted_address || "",
          address: "",
          city: "",
          postal_code: "",
          country: "",
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        };

        place.address_components.forEach((component) => {
          const types = component.types;
          if (types.includes("street_number")) {
            addressData.address = component.long_name;
          } else if (types.includes("route")) {
            addressData.address = addressData.address ? `${addressData.address} ${component.long_name}` : component.long_name;
          } else if (types.includes("locality")) {
            addressData.city = component.long_name;
          } else if (types.includes("sublocality") && !addressData.city) {
            addressData.city = component.long_name;
          } else if (types.includes("administrative_area_level_2") && !addressData.city) {
            addressData.city = component.long_name;
          } else if (types.includes("postal_code")) {
            addressData.postal_code = component.long_name;
          } else if (types.includes("country")) {
            addressData.country = component.long_name;
          }
        });

        const formattedAddress = place.formatted_address || addressData.address || "";
        setInputValue(formattedAddress);
        input.value = formattedAddress;
        onChange(formattedAddress);
        addressData.address = formattedAddress;

        getTimezoneFromCoordinates(addressData.latitude, addressData.longitude)
          .then((timezone) => {
            addressData.timezone = timezone;
            setError(null);
            setIsLoading(false);
            onAddressSelect?.(addressData);
          })
          .catch((err) => {
            console.error("Error getting timezone:", err);
            setError("Address selected but could not determine timezone. Please set it manually.");
            setIsLoading(false);
            onAddressSelect?.(addressData);
          });
      });

      autocompleteElementRef.current = autocomplete;
      setIsLoading(false);
    } catch (err) {
      console.error("Error initializing autocomplete:", err);
      setError(
        `Failed to initialize address autocomplete: ${err instanceof Error ? err.message : String(err)}. Ensure Places API is enabled in Google Cloud Console.`
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !apiKey) {
      if (!apiKey) {
        setError("Google Maps API key not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.");
      }
      return;
    }

    if (!window.google?.maps?.places) {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener("load", initializeAutocomplete);
        return () => existingScript.removeEventListener("load", initializeAutocomplete);
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => setTimeout(initializeAutocomplete, 200);
      script.onerror = () => {
        setError("Failed to load Google Maps API. Check your API key and ensure Places API and Time Zone API are enabled.");
        setIsLoading(false);
      };
      document.head.appendChild(script);
    } else {
      setTimeout(initializeAutocomplete, 200);
    }
  }, [apiKey, placeholder]);

  return (
    <div className="relative">
      <div ref={containerRef} className={`w-full ${className}`.trim()} />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

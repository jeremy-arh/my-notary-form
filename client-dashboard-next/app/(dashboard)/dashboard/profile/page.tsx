"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import AddressAutocomplete from "@/components/form/AddressAutocomplete";

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  France: "FR",
  "United States": "US",
  "United Kingdom": "GB",
  Germany: "DE",
  Spain: "ES",
  Italy: "IT",
  Belgium: "BE",
  Switzerland: "CH",
  Canada: "CA",
  Australia: "AU",
  Netherlands: "NL",
  Portugal: "PT",
  Luxembourg: "LU",
  Monaco: "MC",
  Andorra: "AD",
};

type ProfileData = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({});
  const [phoneDefaultCountry, setPhoneDefaultCountry] = useState<string | undefined>("FR");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        let client: ProfileData | null = null;
        const { data: existing, error } = await supabase
          .from("client")
          .select("first_name, last_name, email, phone, address, city, postal_code, country")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        client = existing;

        if (!client) {
          const res = await fetch("/api/ensure-client", { method: "POST", credentials: "include" });
          if (res.ok) {
            const { client: created } = await res.json();
            client = created;
          }
        }

        const data: ProfileData = {
          first_name: client?.first_name || user.user_metadata?.first_name || "",
          last_name: client?.last_name || user.user_metadata?.last_name || "",
          email: client?.email || user.email || "",
          phone: client?.phone || "",
          address: client?.address || "",
          city: client?.city || "",
          postal_code: client?.postal_code || "",
          country: client?.country || "",
        };

        setProfile(data);
        setFormData(data);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

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

  useEffect(() => {
    if (formData.country) {
      const code = COUNTRY_NAME_TO_CODE[formData.country] || formData.country;
      if (code?.length === 2) {
        setPhoneDefaultCountry(code);
        localStorage.setItem("notaryPhoneCountry", code);
      }
    }
  }, [formData.country]);

  const handleAddressSelect = useCallback(
    (addressData: { formatted_address?: string; address?: string; city?: string; postal_code?: string; country?: string }) => {
      setFormData((p) => ({
        ...p,
        address: addressData.formatted_address || addressData.address || p.address || "",
        city: addressData.city || p.city || "",
        postal_code: addressData.postal_code || p.postal_code || "",
        country: addressData.country || p.country || "",
      }));
    },
    []
  );

  const handleSave = async () => {
    if (!window.confirm("Save your profile changes?")) return;

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name: formData.first_name || "",
          last_name: formData.last_name || "",
          phone: formData.phone || "",
          address: formData.address || "",
          city: formData.city || "",
          postal_code: formData.postal_code || "",
          country: formData.country || "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const { client: updated } = await res.json();
      setProfile(updated);
      setFormData(updated);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  const inputClass =
    "w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-sm sm:text-base placeholder:text-gray-400 placeholder:italic border-gray-200";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Profile information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information. You can edit and save your profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  value={formData.first_name || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, first_name: e.target.value }))}
                  placeholder="First name"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  value={formData.last_name || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, last_name: e.target.value }))}
                  placeholder="Last name"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email || ""}
                disabled
                className={`${inputClass} bg-gray-100 cursor-not-allowed`}
                placeholder="Email"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed. Contact support if needed.</p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                Phone
              </label>
              <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-black focus-within:border-black pl-2 sm:pl-3 pr-2 sm:pr-3">
                <PhoneInput
                  international
                  defaultCountry={phoneDefaultCountry as "FR" | "US" | "GB" | undefined}
                  value={formData.phone || ""}
                  onChange={(value) => setFormData((p) => ({ ...p, phone: value || "" }))}
                  className="phone-input-integrated w-full flex text-sm sm:text-base border-0 outline-none"
                  countrySelectProps={{
                    className: "pr-1 sm:pr-2 py-2.5 sm:py-3 border-0 outline-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors rounded-none text-xs sm:text-sm focus:outline-none focus:ring-0",
                  }}
                  numberInputProps={{
                    className: "flex-1 pl-1 sm:pl-2 py-2.5 sm:py-3 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm sm:text-base",
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                Address
              </label>
              <AddressAutocomplete
                value={formData.address || ""}
                onChange={(value) => setFormData((p) => ({ ...p, address: value }))}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing to search address..."
                className=""
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={formData.city || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="postal_code" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="postal_code"
                  value={formData.postal_code || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, postal_code: e.target.value }))}
                  placeholder="Postal code"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="country" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">
                Country
              </label>
              <input
                type="text"
                id="country"
                value={formData.country || ""}
                onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                placeholder="Country"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-black hover:bg-black/90"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

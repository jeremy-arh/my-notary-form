"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Service = {
  service_id: string;
  name?: string;
  slug?: string;
  code?: string;
  key?: string;
  url_key?: string;
  [key: string]: unknown;
};

type Option = {
  option_id: string;
  service_id?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
};

const CACHE_KEY_SERVICES = "notary_form_services_cache";
const CACHE_KEY_OPTIONS = "notary_form_options_cache";
const CACHE_DURATION = 5 * 60 * 1000;

const getCached = (key: string): unknown[] | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const setCached = (key: string, data: unknown[]) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore
  }
};

const ServicesContext = createContext<{
  services: Service[];
  options: Option[];
  servicesMap: Record<string, Service>;
  optionsMap: Record<string, Option>;
  loading: boolean;
  getServiceName: (service: Service) => string;
  getOptionName: (option: Option) => string;
  getServicesByIds: (serviceIds: string[]) => Service[];
} | null>(null);

export const useServices = () => {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
};

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<Service[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [servicesMap, setServicesMap] = useState<Record<string, Service>>({});
  const [optionsMap, setOptionsMap] = useState<Record<string, Option>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const cachedServices = getCached(CACHE_KEY_SERVICES) as Service[] | null;
      const cachedOptions = getCached(CACHE_KEY_OPTIONS) as Option[] | null;

      if (cachedServices && cachedOptions) {
        const sm: Record<string, Service> = {};
        cachedServices.forEach((s) => { sm[s.service_id] = s; });
        const om: Record<string, Option> = {};
        cachedOptions.forEach((o) => { om[o.option_id] = o; });
        setServices(cachedServices);
        setOptions(cachedOptions);
        setServicesMap(sm);
        setOptionsMap(om);
      }

      try {
        const { data: servicesData, error: se } = await supabase
          .from("services")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (se) throw se;

        const { data: optionsData, error: oe } = await supabase
          .from("options")
          .select("*")
          .eq("is_active", true);

        if (oe) throw oe;

        const s = servicesData || [];
        const o = optionsData || [];
        setServices(s);
        setOptions(o);
        const sm: Record<string, Service> = {};
        s.forEach((sv) => { sm[sv.service_id] = sv; });
        const om: Record<string, Option> = {};
        o.forEach((op) => { om[op.option_id] = op; });
        setServicesMap(sm);
        setOptionsMap(om);
        setCached(CACHE_KEY_SERVICES, s);
        setCached(CACHE_KEY_OPTIONS, o);
      } catch (err) {
        console.error("Error loading services:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getServiceName = (s: Service) => s?.name ?? "";
  const getOptionName = (o: Option) => o?.name ?? "";
  const getServicesByIds = (ids: string[]) =>
    (ids ?? []).map((id) => servicesMap[id]).filter(Boolean);

  return (
    <ServicesContext.Provider value={{ services, options, servicesMap, optionsMap, loading, getServiceName, getOptionName, getServicesByIds }}>
      {children}
    </ServicesContext.Provider>
  );
}


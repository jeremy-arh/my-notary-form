import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from './LanguageContext';

const ServicesContext = createContext();

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};

const CACHE_KEY_SERVICES = 'notary_form_services_cache';
const CACHE_KEY_OPTIONS = 'notary_form_options_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    const cache = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
};

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [options, setOptions] = useState([]);
  const [servicesMap, setServicesMap] = useState({});
  const [optionsMap, setOptionsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      // Try to load from cache first
      const cachedServices = getCachedData(CACHE_KEY_SERVICES);
      const cachedOptions = getCachedData(CACHE_KEY_OPTIONS);

      if (cachedServices && cachedOptions) {
        setServices(cachedServices);
        setOptions(cachedOptions);
        
        // Create maps
        const servicesMapObj = {};
        cachedServices.forEach(service => {
          servicesMapObj[service.service_id] = service;
        });
        setServicesMap(servicesMapObj);

        const optionsMapObj = {};
        cachedOptions.forEach(option => {
          optionsMapObj[option.option_id] = option;
        });
        setOptionsMap(optionsMapObj);
        
        setLoading(false);
      }

      // Always fetch fresh data in the background
      try {
        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (servicesError) throw servicesError;

        // Fetch options
        const { data: optionsData, error: optionsError } = await supabase
          .from('options')
          .select('*')
          .eq('is_active', true);

        if (optionsError) throw optionsError;

        // Update state
        setServices(servicesData || []);
        setOptions(optionsData || []);

        // Create maps
        const servicesMapObj = {};
        (servicesData || []).forEach(service => {
          servicesMapObj[service.service_id] = service;
        });
        setServicesMap(servicesMapObj);

        const optionsMapObj = {};
        (optionsData || []).forEach(option => {
          optionsMapObj[option.option_id] = option;
        });
        setOptionsMap(optionsMapObj);

        // Cache the data
        setCachedData(CACHE_KEY_SERVICES, servicesData || []);
        setCachedData(CACHE_KEY_OPTIONS, optionsData || []);

        setError(null);
      } catch (err) {
        console.error('Error fetching services/options:', err);
        setError(err);
        
        // If we have cached data, keep using it even if fetch failed
        if (!cachedServices || !cachedOptions) {
          setServices([]);
          setOptions([]);
          setServicesMap({});
          setOptionsMap({});
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Clear cache
      localStorage.removeItem(CACHE_KEY_SERVICES);
      localStorage.removeItem(CACHE_KEY_OPTIONS);

      // Fetch fresh data
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (servicesError) throw servicesError;

      const { data: optionsData, error: optionsError } = await supabase
        .from('options')
        .select('*')
        .eq('is_active', true);

      if (optionsError) throw optionsError;

      // Update state
      setServices(servicesData || []);
      setOptions(optionsData || []);

      // Create maps
      const servicesMapObj = {};
      (servicesData || []).forEach(service => {
        servicesMapObj[service.service_id] = service;
      });
      setServicesMap(servicesMapObj);

      const optionsMapObj = {};
      (optionsData || []).forEach(option => {
        optionsMapObj[option.option_id] = option;
      });
      setOptionsMap(optionsMapObj);

      // Cache the data
      setCachedData(CACHE_KEY_SERVICES, servicesData || []);
      setCachedData(CACHE_KEY_OPTIONS, optionsData || []);

      setError(null);
    } catch (err) {
      console.error('Error refreshing services/options:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const getServiceById = (serviceId) => {
    return servicesMap[serviceId] || null;
  };

  const getOptionById = (optionId) => {
    return optionsMap[optionId] || null;
  };

  const getServicesByIds = (serviceIds) => {
    if (!serviceIds || !Array.isArray(serviceIds)) return [];
    return serviceIds.map(id => servicesMap[id]).filter(Boolean);
  };

  const getOptionsByIds = (optionIds) => {
    if (!optionIds || !Array.isArray(optionIds)) return [];
    return optionIds.map(id => optionsMap[id]).filter(Boolean);
  };

  // Helper function to get translated service name
  const getServiceName = (service) => {
    if (!service) return '';
    
    // Check if service has translation fields (name_en, name_fr, etc.)
    const translationKey = `name_${language}`;
    if (service[translationKey]) {
      return service[translationKey];
    }
    
    // Fallback to name field
    return service.name || '';
  };

  // Helper function to get translated option name
  const getOptionName = (option) => {
    if (!option) return '';
    
    // Check if option has translation fields
    const translationKey = `name_${language}`;
    if (option[translationKey]) {
      return option[translationKey];
    }
    
    // Fallback to name field
    return option.name || '';
  };

  const value = {
    services,
    options,
    servicesMap,
    optionsMap,
    loading,
    error,
    refreshData,
    getServiceById,
    getOptionById,
    getServicesByIds,
    getOptionsByIds,
    getServiceName,
    getOptionName,
  };

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};

















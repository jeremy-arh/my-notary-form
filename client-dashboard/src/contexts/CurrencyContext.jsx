import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { initializeCurrency, convertPrice } from '../utils/currency';

const CurrencyContext = createContext({
  currency: 'EUR',
  isLoading: true,
  formatPrice: (price) => `${price}€`,
  setCurrency: () => {},
});

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

const USER_CURRENCY_KEY = 'user_selected_currency';
const LEGACY_CURRENCY_KEY = 'notaryCurrency'; // For backward compatibility

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState('EUR');
  const [isLoading, setIsLoading] = useState(true);
  const [conversionCache, setConversionCache] = useState({});
  const [cacheVersion, setCacheVersion] = useState(0);
  const conversionCacheRef = useRef({});
  
  // Keep ref in sync with state
  useEffect(() => {
    conversionCacheRef.current = conversionCache;
  }, [conversionCache]);

  // Load user-selected currency from localStorage or detect from IP
  useEffect(() => {
    const init = async () => {
      try {
        // Check if user has manually selected a currency (check both keys for compatibility)
        const savedCurrency = localStorage.getItem(USER_CURRENCY_KEY) || localStorage.getItem(LEGACY_CURRENCY_KEY);
        if (savedCurrency) {
          setCurrencyState(savedCurrency);
          // Migrate to new key if using legacy key
          if (localStorage.getItem(LEGACY_CURRENCY_KEY) && !localStorage.getItem(USER_CURRENCY_KEY)) {
            localStorage.setItem(USER_CURRENCY_KEY, savedCurrency);
          }
          setIsLoading(false);
          return;
        }

        // Otherwise, detect from IP
        const detectedCurrency = await initializeCurrency();
        setCurrencyState(detectedCurrency);
      } catch (error) {
        console.warn('Error initializing currency:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Function to set currency (called by CurrencySelector)
  const setCurrency = useCallback((newCurrency) => {
    console.log('💰 [CurrencyContext] setCurrency called with:', newCurrency);
    console.log('💰 [CurrencyContext] Current currency state:', currency);
    if (newCurrency && newCurrency !== currency) {
      setCurrencyState(newCurrency);
      // Save to both keys for compatibility
      localStorage.setItem(USER_CURRENCY_KEY, newCurrency);
      localStorage.setItem(LEGACY_CURRENCY_KEY, newCurrency);
      // Clear conversion cache when currency changes
      setConversionCache({});
      setCacheVersion(prev => prev + 1);
      console.log('💰 [CurrencyContext] Currency state updated to:', newCurrency);
    } else {
      console.warn('💰 [CurrencyContext] Currency not changed (same or invalid):', newCurrency);
    }
  }, [currency]);

  // Helper function to format 0 for a given currency
  const formatZero = (targetCurrency) => {
    const symbolMap = {
      'USD': '$0.00',
      'EUR': '0€',
      'GBP': '£0.00',
      'CAD': 'C$0.00',
      'AUD': 'A$0.00',
      'JPY': '¥0',
      'CHF': 'CHF 0.00',
      'CNY': '¥0.00',
      'INR': '₹ 0.00',
      'BRL': 'R$ 0.00',
      'SEK': 'kr 0.00',
      'NOK': 'kr 0.00',
      'DKK': 'kr 0.00',
      'PLN': 'zł 0.00',
      'CZK': 'Kč 0.00',
      'HUF': 'Ft 0.00',
      'RON': 'lei 0.00',
      'BGN': 'лв 0.00',
      'HRK': 'kn 0.00',
      'RUB': '₽ 0.00',
      'TRY': '₺ 0.00',
      'ZAR': 'R 0.00',
      'KRW': '₩ 0',
      'SGD': 'S$ 0.00',
      'HKD': 'HK$ 0.00',
      'NZD': 'NZ$ 0.00',
      'THB': '฿ 0.00',
      'MYR': 'RM 0.00',
      'PHP': '₱ 0.00',
      'IDR': 'Rp 0.00',
      'VND': '₫ 0',
    };
    // For currencies without decimals (JPY, KRW, VND)
    if (targetCurrency === 'JPY' || targetCurrency === 'KRW' || targetCurrency === 'VND') {
      const formatted = symbolMap[targetCurrency];
      if (formatted) return formatted;
      const symbol = CURRENCY_SYMBOLS[targetCurrency] || targetCurrency;
      return `${symbol}0`;
    }
    return symbolMap[targetCurrency] || `0 ${targetCurrency}`;
  };

  const formatPrice = useCallback(async (eurPrice) => {
    // Handle 0 explicitly - it should always display
    if (eurPrice === 0 || eurPrice === '0') {
      const cacheKey = `0_${currency}`;
      // Check cache first using ref
      if (conversionCacheRef.current[cacheKey]) {
        return conversionCacheRef.current[cacheKey];
      }
      
      try {
        const converted = await convertPrice(0, currency);
        const formatted = converted.formatted;
        setConversionCache(prev => ({
          ...prev,
          [cacheKey]: formatted
        }));
        setCacheVersion(prev => prev + 1);
        return formatted;
      } catch (error) {
        console.warn('Error formatting price:', error);
        return formatZero(currency);
      }
    }
    if (!eurPrice && eurPrice !== 0) return '';
    
    // Check cache first using ref
    const cacheKey = `${eurPrice}_${currency}`;
    if (conversionCacheRef.current[cacheKey]) {
      return conversionCacheRef.current[cacheKey];
    }

    // Trigger async conversion
    try {
      const converted = await convertPrice(eurPrice, currency);
      const formatted = converted.formatted;
      
      // Cache the result
      setConversionCache(prev => ({
        ...prev,
        [cacheKey]: formatted
      }));
      setCacheVersion(prev => prev + 1);
      
      return formatted;
    } catch (error) {
      console.warn('Error formatting price:', error);
      return `${eurPrice}€`;
    }
  }, [currency]);

  // Synchronous version for immediate use (may return EUR if not converted yet)
  // This function triggers async conversion if price is not in cache
  const formatPriceSync = useCallback((eurPrice) => {
    // Handle 0 explicitly - it should always display
    if (eurPrice === 0 || eurPrice === '0') {
      const cacheKey = `0_${currency}`;
      if (conversionCacheRef.current[cacheKey]) {
        return conversionCacheRef.current[cacheKey];
      }
      // Trigger async conversion if not in cache
      if (currency !== 'EUR') {
        formatPrice(0).catch(() => {}); // Fire and forget
      }
      // Return formatted 0 for current currency
      return formatZero(currency);
    }
    if (!eurPrice && eurPrice !== 0) return '';
    const cacheKey = `${eurPrice}_${currency}`;
    
    // If not in cache and currency is not EUR, trigger async conversion
    if (!conversionCacheRef.current[cacheKey] && currency !== 'EUR') {
      formatPrice(eurPrice).catch(() => {}); // Fire and forget
    }
    
    return conversionCacheRef.current[cacheKey] || `${eurPrice}€`;
  }, [currency, formatPrice]);

  return (
    <CurrencyContext.Provider value={{
      currency,
      isLoading,
      formatPrice,
      formatPriceSync,
      setCurrency,
      cacheVersion, // Expose cache version to trigger re-renders when cache updates
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};


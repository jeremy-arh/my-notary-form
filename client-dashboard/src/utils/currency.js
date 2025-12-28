/**
 * Currency detection and conversion utility
 * Detects user's currency based on IP geolocation and converts EUR prices
 */

const CURRENCY_CACHE_KEY = 'user_currency';
const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const EXCHANGE_RATE_CACHE_KEY = 'exchange_rates';
const EXCHANGE_RATE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
  MXN: '$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  HRK: 'kn',
  RUB: '₽',
  TRY: '₺',
  ZAR: 'R',
  KRW: '₩',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  THB: '฿',
  MYR: 'RM',
  PHP: '₱',
  IDR: 'Rp',
  VND: '₫',
};

// Default currency fallback
const DEFAULT_CURRENCY = 'EUR';

/**
 * Get currency from cache
 */
const getCachedCurrency = () => {
  try {
    const cached = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (cached) {
      const { currency, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CURRENCY_CACHE_TTL) {
        return currency;
      }
    }
  } catch (error) {
    console.warn('Error reading currency cache:', error);
  }
  return null;
};

/**
 * Save currency to cache
 */
const saveCurrencyToCache = (currency) => {
  try {
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify({
      currency,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Error saving currency cache:', error);
  }
};

/**
 * Get exchange rates from cache
 */
const getCachedExchangeRates = () => {
  try {
    const cached = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < EXCHANGE_RATE_CACHE_TTL) {
        return rates;
      }
    }
  } catch (error) {
    console.warn('Error reading exchange rates cache:', error);
  }
  return null;
};

/**
 * Save exchange rates to cache
 */
const saveExchangeRatesToCache = (rates) => {
  try {
    localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify({
      rates,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Error saving exchange rates cache:', error);
  }
};

/**
 * Detect user's currency based on IP geolocation
 * Uses ipapi.co free tier (1000 requests/day)
 */
export const detectCurrencyFromIP = async () => {
  // Check cache first
  const cached = getCachedCurrency();
  if (cached) {
    return cached;
  }

  try {
    // Use ipapi.co free API
    const response = await fetch('https://ipapi.co/json/', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch geolocation');
    }

    const data = await response.json();
    
    if (data.currency) {
      const currency = data.currency.toUpperCase();
      saveCurrencyToCache(currency);
      return currency;
    }
  } catch (error) {
    console.warn('Error detecting currency from IP:', error);
  }

  // Fallback to browser locale
  return detectCurrencyFromLocale();
};

/**
 * Detect currency from browser locale as fallback
 */
const detectCurrencyFromLocale = () => {
  try {
    const locale = navigator.language || navigator.userLanguage;
    const region = locale.split('-')[1] || locale.split('_')[1];
    
    // Map common regions to currencies
    const regionToCurrency = {
      'US': 'USD',
      'GB': 'GBP',
      'CA': 'CAD',
      'AU': 'AUD',
      'JP': 'JPY',
      'CH': 'CHF',
      'CN': 'CNY',
      'IN': 'INR',
      'BR': 'BRL',
      'MX': 'MXN',
      'SE': 'SEK',
      'NO': 'NOK',
      'DK': 'DKK',
      'PL': 'PLN',
      'CZ': 'CZK',
      'HU': 'HUF',
      'RO': 'RON',
      'BG': 'BGN',
      'HR': 'HRK',
      'RU': 'RUB',
      'TR': 'TRY',
      'ZA': 'ZAR',
      'KR': 'KRW',
      'SG': 'SGD',
      'HK': 'HKD',
      'NZ': 'NZD',
      'TH': 'THB',
      'MY': 'MYR',
      'PH': 'PHP',
      'ID': 'IDR',
      'VN': 'VND',
    };

    const currency = regionToCurrency[region] || DEFAULT_CURRENCY;
    saveCurrencyToCache(currency);
    return currency;
  } catch (error) {
    console.warn('Error detecting currency from locale:', error);
    return DEFAULT_CURRENCY;
  }
};

/**
 * Fetch exchange rates from EUR
 * Uses exchangerate-api.com free tier
 */
const fetchExchangeRates = async () => {
  // Check cache first
  const cached = getCachedExchangeRates();
  if (cached) {
    return cached;
  }

  try {
    // Using exchangerate-api.com free endpoint
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    
    if (data.rates) {
      saveExchangeRatesToCache(data.rates);
      return data.rates;
    }
  } catch (error) {
    console.warn('Error fetching exchange rates:', error);
  }

  return null;
};

/**
 * Convert EUR price to target currency
 */
export const convertPrice = async (eurPrice, targetCurrency = null) => {
  if (!eurPrice || !targetCurrency || targetCurrency === 'EUR') {
    return {
      amount: eurPrice,
      currency: 'EUR',
      symbol: '€',
      formatted: `${eurPrice}€`
    };
  }

  try {
    const rates = await fetchExchangeRates();
    
    if (!rates || !rates[targetCurrency]) {
      // Fallback to EUR if conversion fails
      return {
        amount: eurPrice,
        currency: 'EUR',
        symbol: '€',
        formatted: `${eurPrice}€`
      };
    }

    const rate = rates[targetCurrency];
    const convertedAmount = Math.round(eurPrice * rate * 100) / 100; // Round to 2 decimals
    
    const symbol = CURRENCY_SYMBOLS[targetCurrency] || targetCurrency;
    
    // Currencies that need a space between symbol and amount
    // Note: EUR uses € after the amount, so no space needed
    const currenciesWithSpace = ['CHF', 'GBP', 'CAD', 'AUD', 'CNY', 'INR', 'BRL', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'TRY', 'ZAR', 'KRW', 'SGD', 'HKD', 'NZD', 'THB', 'MYR', 'PHP', 'IDR', 'VND'];
    
    // Format based on currency
    let formatted;
    const needsSpace = currenciesWithSpace.includes(targetCurrency);
    const space = needsSpace ? ' ' : '';
    
    if (targetCurrency === 'EUR') {
      // EUR: amount followed by € symbol
      formatted = `${convertedAmount.toFixed(2)}€`;
    } else if (targetCurrency === 'JPY' || targetCurrency === 'KRW' || targetCurrency === 'VND') {
      // No decimals for these currencies
      formatted = `${symbol}${space}${Math.round(convertedAmount)}`;
    } else {
      formatted = `${symbol}${space}${convertedAmount.toFixed(2)}`;
    }

    return {
      amount: convertedAmount,
      currency: targetCurrency,
      symbol,
      formatted
    };
  } catch (error) {
    console.warn('Error converting price:', error);
    // Fallback to EUR
    return {
      amount: eurPrice,
      currency: 'EUR',
      symbol: '€',
      formatted: `${eurPrice}€`
    };
  }
};

/**
 * Initialize currency detection
 * Call this on app load
 */
export const initializeCurrency = async () => {
  try {
    const currency = await detectCurrencyFromIP();
    return currency;
  } catch (error) {
    console.warn('Error initializing currency:', error);
    return DEFAULT_CURRENCY;
  }
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency) => {
  return CURRENCY_SYMBOLS[currency] || currency;
};

// Legacy function for backward compatibility
export const getCurrency = () => {
  try {
    const savedCurrency = localStorage.getItem('user_selected_currency') || localStorage.getItem('notaryCurrency');
    if (savedCurrency) {
      return savedCurrency;
    }
  } catch (error) {
    console.error('❌ [CURRENCY] Erreur lors du chargement depuis localStorage:', error);
  }
  return 'EUR'; // Default to EUR
};

/**
 * Legacy formatPrice function for backward compatibility
 * This is a synchronous version that formats prices in EUR
 * For dynamic currency conversion, use CurrencyContext instead
 */
export const formatPrice = (eurAmount) => {
  if (!eurAmount && eurAmount !== 0) return '';
  
  // Get current currency from localStorage
  const currentCurrency = getCurrency();
  
  // If EUR, return simple format
  if (currentCurrency === 'EUR') {
    return `${eurAmount}€`;
  }
  
  // For other currencies, use approximate conversion (synchronous fallback)
  const exchangeRates = {
    'USD': 1.10,
    'GBP': 0.85,
    'CAD': 1.50,
    'AUD': 1.65,
    'CHF': 0.95,
    'JPY': 165,
    'CNY': 7.80,
    'INR': 91,
    'BRL': 5.50,
    'MXN': 18.50,
    'SEK': 11.50,
    'NOK': 11.50,
    'DKK': 7.50,
    'PLN': 4.30,
    'CZK': 25,
    'HUF': 400,
    'RON': 5,
    'BGN': 2,
    'HRK': 7.50,
    'RUB': 100,
    'TRY': 35,
    'ZAR': 20,
    'KRW': 1450,
    'SGD': 1.50,
    'HKD': 8.50,
    'NZD': 1.80,
    'THB': 39,
    'MYR': 5,
    'PHP': 61,
    'IDR': 17000,
    'VND': 27000,
  };
  
  const rate = exchangeRates[currentCurrency] || 1;
  const convertedAmount = Math.round(eurAmount * rate * 100) / 100;
  const symbol = CURRENCY_SYMBOLS[currentCurrency] || currentCurrency;
  
  // Format based on currency
  if (currentCurrency === 'JPY' || currentCurrency === 'KRW' || currentCurrency === 'VND') {
    return `${symbol}${Math.round(convertedAmount)}`;
  }
  
  return `${symbol}${convertedAmount.toFixed(2)}`;
};


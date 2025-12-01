/**
 * Currency conversion and formatting utilities
 */

// Get currency from localStorage or default to EUR
export const getCurrency = () => {
  try {
    const savedCurrency = localStorage.getItem('notaryCurrency');
    const validCurrencies = ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY'];
    if (savedCurrency && validCurrencies.includes(savedCurrency)) {
      return savedCurrency;
    }
  } catch (error) {
    console.error('❌ [CURRENCY] Erreur lors du chargement depuis localStorage:', error);
  }
  return 'EUR'; // Default to EUR
};

// Convert EUR price to target currency
export const convertPrice = (eurAmount, currency = null) => {
  const targetCurrency = currency || getCurrency();
  
  // If currency is EUR, no conversion needed
  if (targetCurrency === 'EUR') {
    return eurAmount;
  }

  // Fallback to approximate exchange rates
  const exchangeRates = {
    'USD': 1.10,  // 1 EUR = 1.10 USD (approximate)
    'GBP': 0.85,  // 1 EUR = 0.85 GBP (approximate)
    'CAD': 1.50,  // 1 EUR = 1.50 CAD (approximate)
    'AUD': 1.65,  // 1 EUR = 1.65 AUD (approximate)
    'CHF': 0.95,  // 1 EUR = 0.95 CHF (approximate)
    'JPY': 165,   // 1 EUR = 165 JPY (approximate)
    'CNY': 7.80   // 1 EUR = 7.80 CNY (approximate)
  };

  const rate = exchangeRates[targetCurrency] || 1;
  return eurAmount * rate;
};

// Format price according to currency
export const formatPrice = (eurAmount, currency = null) => {
  const targetCurrency = currency || getCurrency();
  const convertedAmount = convertPrice(eurAmount, targetCurrency);
  
  const localeMap = {
    'USD': 'en-US',
    'GBP': 'en-GB',
    'CAD': 'en-CA',
    'AUD': 'en-AU',
    'CHF': 'de-CH',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN',
    'EUR': 'fr-FR'
  };
  
  const locale = localeMap[targetCurrency] || 'fr-FR';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: targetCurrency
  }).format(convertedAmount);
};





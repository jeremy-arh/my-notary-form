import { useState, useEffect, useRef, useMemo } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
];

const CurrencySelector = ({ openDirection = 'top' }) => {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Recalculate selectedCurrency whenever currency changes
  const selectedCurrency = useMemo(() => {
    const found = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    console.log('💰 [CurrencySelector] selectedCurrency recalculated:', found.code, 'from currency:', currency);
    return found;
  }, [currency]);

  // Debug: Log currency changes
  useEffect(() => {
    console.log('💰 [CurrencySelector] Currency changed to:', currency);
    console.log('💰 [CurrencySelector] selectedCurrency.code:', selectedCurrency.code);
  }, [currency, selectedCurrency]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCurrencyChange = (newCurrency) => {
    console.log('💰 [CurrencySelector] handleCurrencyChange called with:', newCurrency);
    console.log('💰 [CurrencySelector] Current currency before change:', currency);
    setCurrency(newCurrency);
    console.log('💰 [CurrencySelector] setCurrency called');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
        aria-label="Select currency"
        aria-expanded={isOpen}
      >
        <span className="text-lg">{selectedCurrency.symbol}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute left-1/2 -translate-x-1/2 ${openDirection === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} w-44 bg-white rounded-lg shadow-lg py-1 z-[200] max-h-96 overflow-y-auto`}>
          {CURRENCIES.map((curr) => (
            <button
              key={curr.code}
              onClick={() => handleCurrencyChange(curr.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                currency === curr.code ? 'bg-gray-50 font-semibold' : ''
              }`}
            >
              <span className="text-lg">{curr.code.toLowerCase()}</span>
              <span>{curr.symbol}</span>
              {currency === curr.code && (
                <svg
                  className="w-4 h-4 ml-auto text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;

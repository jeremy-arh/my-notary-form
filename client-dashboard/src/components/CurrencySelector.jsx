import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { getCurrency } from '../utils/currency';

const CurrencySelector = ({ formData, updateFormData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState(formData.currency || 'EUR');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const currencies = [
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }
  ];

  useEffect(() => {
    setCurrentCurrency(formData.currency || getCurrency());
  }, [formData.currency]);

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Fermer le dropdown avec Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleCurrencyChange = (currencyCode) => {
    setCurrentCurrency(currencyCode);
    updateFormData({ currency: currencyCode });
    
    // Sauvegarder dans localStorage
    try {
      localStorage.setItem('notaryCurrency', currencyCode);
      console.log('💰 [CURRENCY] Devise changée:', currencyCode);
    } catch (error) {
      console.error('❌ [CURRENCY] Erreur lors de la sauvegarde:', error);
    }
    
    setIsOpen(false);
  };

  const currentCurrencyData = currencies.find(c => c.code === currentCurrency) || currencies[0];

  return (
    <div className="relative w-full">
      {/* Bouton principal - Responsive */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full
          flex items-center justify-between gap-1.5
          px-2 py-1.5
          sm:px-3 sm:py-2
          lg:px-4 lg:py-2.5
          rounded-lg
          border border-gray-300
          bg-white
          hover:bg-gray-50
          active:bg-gray-100
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          text-gray-700
          font-medium
          min-w-0
        "
        aria-label="Sélectionner une devise"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Icône devise */}
        <Icon 
          icon="heroicons:currency-dollar" 
          className="
            w-3.5 h-3.5
            sm:w-4 sm:h-4
            lg:w-5 lg:h-5
            text-gray-600
            flex-shrink-0
          " 
        />
        
        {/* Code devise */}
        <span className="
          font-semibold
          text-xs
          sm:text-sm
          lg:text-base
          text-gray-900
          truncate
          flex-1
          text-left
        ">
          {currentCurrencyData.code}
        </span>
        
        {/* Icône chevron */}
        <Icon 
          icon={isOpen ? "heroicons:chevron-up" : "heroicons:chevron-down"} 
          className="
            w-3.5 h-3.5
            sm:w-4 sm:h-4
            lg:w-5 lg:h-5
            text-gray-500
            flex-shrink-0
            transition-transform duration-200
          " 
        />
      </button>

      {/* Dropdown menu - Responsive */}
      {isOpen && (
        <>
          {/* Overlay pour mobile */}
          <div 
            className="
              fixed inset-0 z-[100]
              lg:hidden
            " 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Menu dropdown */}
          <div 
            ref={dropdownRef}
            className="
              absolute
              left-0
              right-0
              lg:left-auto lg:right-0
              mt-1.5
              sm:mt-2
              w-full
              lg:w-64
              bg-white
              rounded-lg
              shadow-xl
              border-2 border-gray-300
              z-[200]
              max-h-[70vh]
              sm:max-h-80
              overflow-hidden
              animate-in fade-in slide-in-from-top-2
            "
            role="listbox"
            style={{ position: 'absolute' }}
          >
            {/* Liste des devises */}
            <div className="py-1 overflow-y-auto max-h-[70vh] sm:max-h-80">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => handleCurrencyChange(currency.code)}
                  className={`
                    w-full
                    text-left
                    px-3 py-2.5
                    sm:px-4 sm:py-3
                    hover:bg-gray-50
                    active:bg-gray-100
                    transition-colors duration-150
                    flex items-center justify-between
                    gap-2
                    min-w-0
                    ${currentCurrency === currency.code 
                      ? 'bg-blue-50 hover:bg-blue-100' 
                      : ''
                    }
                  `}
                  role="option"
                  aria-selected={currentCurrency === currency.code}
                >
                  {/* Informations devise */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="
                      text-gray-700
                      text-sm
                      sm:text-base
                      font-medium
                      flex-shrink-0
                    ">
                      {currency.symbol}
                    </span>
                    <span className="
                      text-gray-900
                      font-semibold
                      text-sm
                      sm:text-base
                      flex-shrink-0
                    ">
                      {currency.code}
                    </span>
                    <span className="
                      text-gray-500
                      text-xs
                      sm:text-sm
                      truncate
                      hidden
                      sm:inline
                      flex-1
                    ">
                      {currency.name}
                    </span>
                  </div>
                  
                  {/* Icône de sélection */}
                  {currentCurrency === currency.code && (
                    <Icon 
                      icon="heroicons:check" 
                      className="
                        w-4 h-4
                        sm:w-5 sm:h-5
                        text-blue-600
                        flex-shrink-0
                      " 
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CurrencySelector;

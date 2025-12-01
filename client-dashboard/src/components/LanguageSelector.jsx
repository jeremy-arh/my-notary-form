import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LANGUAGE_NAMES = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
};

// Codes pays pour les drapeaux (ISO 3166-1 alpha-2)
const LANGUAGE_COUNTRIES = {
  en: 'gb', // Royaume-Uni
  fr: 'fr', // France
  es: 'es', // Espagne
  de: 'de', // Allemagne
  it: 'it', // Italie
  pt: 'pt', // Portugal
};

// Fonction pour obtenir l'URL de l'image du drapeau
const getFlagUrl = (lang) => {
  const countryCode = LANGUAGE_COUNTRIES[lang] || 'gb';
  return `https://flagcdn.com/w20/${countryCode}.png`;
};

const LANGUAGES = Object.keys(LANGUAGE_NAMES);

const LanguageSelector = ({ openDirection = 'top' }) => {
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <img
          src={getFlagUrl(language)}
          alt={`Flag of ${LANGUAGE_NAMES[language] || language}`}
          className="w-5 h-4 object-cover rounded"
          onError={(e) => {
            e.target.style.display = 'none';
            const fallback = e.target.nextSibling;
            if (fallback) fallback.style.display = 'inline';
          }}
        />
        <span className="text-lg hidden">🌐</span>
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
          {supportedLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                language === lang ? 'bg-gray-50 font-semibold' : ''
              }`}
            >
              <img
                src={getFlagUrl(lang)}
                alt={`Flag of ${LANGUAGE_NAMES[lang]}`}
                className="w-5 h-4 object-cover rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.nextSibling;
                  if (fallback) fallback.style.display = 'inline';
                }}
              />
              <span className="text-lg hidden">🌐</span>
              <span>{LANGUAGE_NAMES[lang]}</span>
              {language === lang && (
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

export default LanguageSelector;


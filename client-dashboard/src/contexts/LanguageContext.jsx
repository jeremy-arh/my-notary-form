import { createContext, useContext, useState, useEffect } from 'react';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'de', 'it', 'pt'];
const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_STORAGE_KEY = 'user_language';

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      // 1. Vérifier d'abord si une langue est sauvegardée dans localStorage
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved;
      }
      
      // 2. Sinon, utiliser la langue du navigateur
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(browserLang)) {
        return browserLang;
      }
      
      // 3. Si la langue du navigateur n'est pas supportée, utiliser l'anglais par défaut
      return DEFAULT_LANGUAGE;
    } catch {
      // En cas d'erreur, utiliser l'anglais par défaut
      return DEFAULT_LANGUAGE;
    }
  });

  const setLanguage = (newLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(newLanguage)) {
      console.warn(`Language ${newLanguage} is not supported`);
      return;
    }
    setLanguageState(newLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};


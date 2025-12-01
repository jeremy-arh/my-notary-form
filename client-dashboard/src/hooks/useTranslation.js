import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../i18n/translations';

/**
 * Hook pour utiliser les traductions
 * @param {string} key - Clé de traduction (ex: 'form.steps.chooseOption.title')
 * @returns {string} - Texte traduit
 */
export const useTranslation = () => {
  const { language } = useLanguage();

  const t = (key, fallback = '') => {
    const keys = key.split('.');
    let value = translations[language];

    // Si la langue n'existe pas, utiliser l'anglais par défaut
    if (!value) {
      value = translations['en'];
    }

    for (const k of keys) {
      if (value && typeof value === 'object' && value !== null) {
        value = value[k];
      } else {
        // Si la valeur n'existe pas, essayer avec l'anglais
        if (language !== 'en') {
          let enValue = translations['en'];
          for (const enKey of keys) {
            if (enValue && typeof enValue === 'object' && enValue !== null) {
              enValue = enValue[enKey];
            } else {
              return fallback || key;
            }
          }
          return enValue || fallback || key;
        }
        return fallback || key;
      }
    }

    // Si la valeur est undefined/null et qu'on n'est pas en anglais, essayer l'anglais
    if ((value === undefined || value === null) && language !== 'en') {
      let enValue = translations['en'];
      for (const k of keys) {
        if (enValue && typeof enValue === 'object' && enValue !== null) {
          enValue = enValue[k];
        } else {
          return fallback || key;
        }
      }
      return enValue || fallback || key;
    }

    return value !== undefined && value !== null ? value : (fallback || key);
  };

  return { t, language };
};


import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en.json';
import jaTranslation from './locales/ja.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ja: {
        translation: jaTranslation,
      },
    },
    fallbackLng: 'en',
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Key to store language preference in localStorage
      lookupLocalStorage: 'preferred-language',
      // Cache the language detection result in localStorage
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;

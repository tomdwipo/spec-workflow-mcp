import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Use dynamic imports when REACT_APP_I18N_DYNAMIC is set to 'true'
// This reduces initial bundle size by loading translations on demand
// To enable: Set REACT_APP_I18N_DYNAMIC=true in your .env file
// Then use './i18n-dynamic' instead of './i18n' in main.tsx
const USE_DYNAMIC_IMPORT = process.env.REACT_APP_I18N_DYNAMIC === 'true';

// Static imports (default for backward compatibility)
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
      escapeValue: true, // Enable for defense-in-depth, even though React provides XSS protection
    },
  });

export default i18n;

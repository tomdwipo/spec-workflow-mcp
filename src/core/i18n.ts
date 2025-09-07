import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Since we are in an ES module, __dirname is not available.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.resolve(__dirname, '../locales');
const translations: { [key: string]: any } = {};
let translationsLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Load translations asynchronously with caching
async function loadTranslations(): Promise<void> {
  if (translationsLoaded) return;
  
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    try {
      // Validate that locale directory exists
      try {
        await fs.access(localesDir);
      } catch (error) {
        console.warn(`Locales directory not found at ${localesDir}. Using fallback translations.`);
        translations['en'] = {};
        translations['ja'] = {};
        translationsLoaded = true;
        return;
      }

      const [enResult, jaResult] = await Promise.all([
        fs.readFile(path.join(localesDir, 'en.json'), 'utf8').then(content => ({ content, error: null })).catch(error => ({ content: null, error })),
        fs.readFile(path.join(localesDir, 'ja.json'), 'utf8').then(content => ({ content, error: null })).catch(error => ({ content: null, error }))
      ]);
      
      // Handle English translations
      if (enResult.content) {
        try {
          translations['en'] = JSON.parse(enResult.content);
        } catch (parseError) {
          console.error('Error parsing en.json:', parseError);
          translations['en'] = {};
        }
      } else {
        console.warn('English translation file (en.json) not found or unreadable:', enResult.error);
        translations['en'] = {};
      }
      
      // Handle Japanese translations
      if (jaResult.content) {
        try {
          translations['ja'] = JSON.parse(jaResult.content);
        } catch (parseError) {
          console.error('Error parsing ja.json:', parseError);
          translations['ja'] = {};
        }
      } else {
        console.warn('Japanese translation file (ja.json) not found or unreadable:', jaResult.error);
        translations['ja'] = {};
      }
      
      translationsLoaded = true;
    } catch (error) {
      console.error('Critical error loading translation files:', error);
      // Fallback to empty translations
      translations['en'] = {};
      translations['ja'] = {};
      translationsLoaded = true;
    }
  })();

  await loadingPromise;
}

// Initialize translations on first import (non-blocking)
loadTranslations().catch(error => {
  console.error('Failed to initialize translations on import:', error);
  // Note: This is a non-blocking error and shouldn't prevent the application from starting
  // Translations will fall back to using the key as the displayed text
});

/**
 * Navigates through a nested object using a dot-separated key path.
 * @param obj - The object to navigate through
 * @param path - The dot-separated key path (e.g., 'nav.statistics')
 * @returns The value at the specified path, or undefined if not found
 * @example
 * navigate({ nav: { statistics: 'Stats' } }, 'nav.statistics') // returns 'Stats'
 */
function navigate(obj: Record<string, any> | undefined, path: string): any {
  if (!obj) return undefined;
  return path.split('.').reduce((acc: any, part: string) => acc?.[part], obj);
}

/**
 * Translates a given key to the specified language with optional interpolation.
 * @param key - The translation key to look up (supports dot notation for nested keys)
 * @param lang - The target language code (defaults to 'en')
 * @param options - Optional key-value pairs for string interpolation using {{key}} syntax
 * @returns The translated string, or the key itself as fallback if translation is not found
 * @example
 * translate('welcome.message', 'en', { name: 'John' }) // returns translated text with {{name}} replaced
 */
export function translate(key: string, lang: string = 'en', options?: { [key: string]: string | number }): string {
  // Use cached translations if available, otherwise return key as fallback
  const langTranslations = translations[lang] || translations['en'] || {};
  let translation = navigate(langTranslations, key) || key;

  if (options) {
    Object.keys(options).forEach(optionKey => {
      translation = translation.replace(`{{${optionKey}}}`, String(options[optionKey]));
    });
  }

  return translation;
}

// Export async initialization for cases where we need to ensure translations are loaded
export async function ensureTranslationsLoaded(): Promise<void> {
  await loadTranslations();
}

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
      const [enContent, jaContent] = await Promise.all([
        fs.readFile(path.join(localesDir, 'en.json'), 'utf8').catch(() => '{}'),
        fs.readFile(path.join(localesDir, 'ja.json'), 'utf8').catch(() => '{}')
      ]);
      
      translations['en'] = JSON.parse(enContent);
      translations['ja'] = JSON.parse(jaContent);
      translationsLoaded = true;
    } catch (error) {
      console.error('Error loading translation files:', error);
      // Fallback to empty translations
      translations['en'] = {};
      translations['ja'] = {};
      translationsLoaded = true;
    }
  })();

  await loadingPromise;
}

// Initialize translations on first import (non-blocking)
loadTranslations().catch(console.error);

// Simple key navigation, e.g., 'nav.statistics'
function navigate(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

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

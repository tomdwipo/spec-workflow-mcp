import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Since we are in an ES module, __dirname is not available.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.resolve(__dirname, '../locales');
const translations: { [key: string]: any } = {};

try {
  const en = fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8');
  translations['en'] = JSON.parse(en);
  const ja = fs.readFileSync(path.join(localesDir, 'ja.json'), 'utf8');
  translations['ja'] = JSON.parse(ja);
} catch (error) {
  console.error('Error loading translation files:', error);
}

// Simple key navigation, e.g., 'nav.statistics'
function navigate(obj: any, path: string) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function translate(key: string, lang: string = 'en', options?: { [key: string]: string | number }): string {
  const langTranslations = translations[lang] || translations['en'];
  let translation = navigate(langTranslations, key) || key;

  if (options) {
    Object.keys(options).forEach(optionKey => {
      translation = translation.replace(`{{${optionKey}}}`, String(options[optionKey]));
    });
  }

  return translation;
}

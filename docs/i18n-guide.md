# Internationalization (i18n) Guide

This project implements comprehensive internationalization support across all components: React frontend, VSCode extension, and backend MCP tools.

## Architecture Overview

### Frontend (React Dashboard)
- **Framework**: `react-i18next` with browser language detection
- **Location**: `src/dashboard_frontend/src/i18n.ts`
- **Translation Files**: `src/dashboard_frontend/src/locales/`

### VSCode Extension  
- **Framework**: `vscode-nls` compatibility with `react-i18next` for webviews
- **Location**: `vscode-extension/src/webview/i18n.ts`
- **Translation Files**: `vscode-extension/src/webview/locales/`

### Backend (MCP Tools)
- **Framework**: Custom lightweight solution with async loading
- **Location**: `src/core/i18n.ts`
- **Translation Files**: `src/locales/`

## Using the Translation System

### Backend MCP Tools

```typescript
import { translate } from '../core/i18n.js';
import { ToolContext } from '../types.js';

export async function toolHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  const lang = context.lang || 'en';
  
  return {
    success: true,
    message: translate('tools.myTool.success', lang, { 
      name: args.name,
      count: args.items.length 
    }),
    nextSteps: [
      translate('tools.myTool.nextSteps.first', lang),
      translate('tools.myTool.nextSteps.second', lang)
    ]
  };
}
```

### React Frontend

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('nav.dashboard.title')}</h1>
      <p>{t('welcome.message', { name: 'User', count: 5 })}</p>
    </div>
  );
}
```

### VSCode Extension Webview

```typescript
import { useTranslation } from 'react-i18next';

function WebviewComponent() {
  const { t } = useTranslation();
  
  return (
    <button>{t('actions.approve')}</button>
  );
}
```

## Translation File Structure

### JSON Format
```json
{
  "nav": {
    "dashboard": {
      "title": "Dashboard",
      "stats": "Statistics"
    }
  },
  "tools": {
    "specStatus": {
      "description": "Get current status of a specification",
      "success": "Spec {{specName}} is currently {{status}}"
    }
  }
}
```

### Key Naming Convention
- Use dot notation for nested keys: `nav.dashboard.title`
- Group by functional area: `tools.`, `nav.`, `errors.`
- Use descriptive names: `specStatus` not `ss`

## String Interpolation

### Backend
```typescript
translate('welcome.message', 'en', { 
  name: 'John',
  count: 42 
})
// Uses {{name}} and {{count}} in translation strings
```

### Frontend
```typescript
t('welcome.message', { 
  name: 'John',
  count: 42 
})
// Uses {{name}} and {{count}} in translation strings
```

## Language Support

### Currently Supported
- **English** (`en`) - Default fallback language
- **Japanese** (`ja`) - Complete translations

### Adding New Languages

1. **Backend**: Add new JSON file in `src/locales/`
2. **Frontend**: Add new JSON file in `src/dashboard_frontend/src/locales/`
3. **VSCode Extension**: Add new JSON files in `vscode-extension/src/webview/locales/`
4. **Update validation script**: Add language code to `scripts/validate-i18n.js`

## Error Handling

### Missing Translations
- Backend: Returns the translation key as fallback
- Frontend: Returns the translation key as fallback  
- Graceful degradation ensures app continues to work

### File Loading Errors
- Backend: Non-blocking async loading with comprehensive error logging
- Frontend: React i18next handles missing files gracefully
- Build validation prevents deployment with broken translation files

## Performance Considerations

### Backend
- **Async Loading**: Translation files load asynchronously on first use
- **Caching**: Single loading promise prevents duplicate file reads
- **Memory Efficient**: Translations cached in memory after first load

### Frontend
- **Lazy Loading**: Languages loaded on demand
- **Browser Caching**: localStorage persistence for language selection
- **Bundle Optimization**: Consider code splitting for large translation sets

## Build Process

### Validation
```bash
npm run validate:i18n
```
Checks that all translation files exist and contain valid JSON.

### Testing
```bash
npm test          # Run all tests including i18n
npm run test:watch # Watch mode for development
npm run test:coverage # Generate coverage report
```

## Development Workflow

### Adding New Translation Keys

1. **Add to English files first** (default fallback)
2. **Add to other language files** 
3. **Run validation**: `npm run validate:i18n`
4. **Update tests** if needed
5. **Test in all environments**

### Testing Translations

```typescript
// Unit test example
describe('translate function', () => {
  it('should handle interpolation', () => {
    const result = translate('welcome', 'en', { name: 'Test' });
    expect(result).toBe('Welcome, Test!');
  });
});
```

## Best Practices

### Translation Keys
- ✅ Use descriptive keys: `tools.specStatus.success`
- ❌ Avoid generic keys: `msg1`, `text`
- ✅ Group logically: `errors.notFound`, `errors.permission`
- ✅ Keep consistent: same structure across languages

### String Interpolation  
- ✅ Use meaningful parameter names: `{{userName}}` not `{{p1}}`
- ✅ Handle pluralization properly
- ✅ Keep interpolation simple

### Error Handling
- ✅ Always provide fallbacks
- ✅ Log missing translations in development
- ✅ Never let translation errors break the app

### Performance
- ✅ Lazy load translations when possible
- ✅ Cache loaded translations
- ✅ Validate translations at build time
- ✅ Monitor bundle size impact

## Troubleshooting

### Common Issues

**Translations not loading in backend tools**
- Check that `src/locales/` directory exists
- Verify JSON syntax in translation files
- Check console for loading errors

**Language detection not working in frontend**
- Verify browser language settings
- Check localStorage for saved preferences
- Ensure language selector is working

**VSCode extension translations missing**
- Check that translation files are included in extension bundle
- Verify `package.json` contributes configuration
- Test in VSCode extension development host

### Debug Commands

```bash
# Validate all translation files
npm run validate:i18n

# Run i18n tests specifically  
npm test -- --grep="i18n"

# Build with verbose logging
npm run build -- --verbose
```
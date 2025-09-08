import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { translate, ensureTranslationsLoaded } from '../i18n.js';

// Mock file system
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

vi.mock('path', () => ({
  resolve: vi.fn(),
  dirname: vi.fn(),
  join: vi.fn(),
}));

vi.mock('url', () => ({
  fileURLToPath: vi.fn(() => '/mock/path/i18n.js'),
}));

const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup path mocks
    mockPath.dirname.mockReturnValue('/mock/path');
    mockPath.resolve.mockReturnValue('/mock/path/locales');
    mockPath.join.mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('translate function', () => {
    it('should return key as fallback when no translations are loaded', () => {
      const result = translate('test.key');
      expect(result).toBe('test.key');
    });

    it('should translate simple keys', async () => {
      // Mock successful file reads
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('{"test":{"key":"English Value"}}')  // en.json
        .mockResolvedValueOnce('{"test":{"key":"日本語の値"}}');     // ja.json

      await ensureTranslationsLoaded();
      
      const englishResult = translate('test.key', 'en');
      const japaneseResult = translate('test.key', 'ja');
      
      expect(englishResult).toBe('English Value');
      expect(japaneseResult).toBe('日本語の値');
    });

    it('should handle nested dot notation keys', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('{"nav":{"dashboard":{"title":"Dashboard"}}}')
        .mockResolvedValueOnce('{"nav":{"dashboard":{"title":"ダッシュボード"}}}');

      await ensureTranslationsLoaded();
      
      const result = translate('nav.dashboard.title', 'en');
      expect(result).toBe('Dashboard');
    });

    it('should perform string interpolation with options', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('{"welcome":"Hello {{name}}, you have {{count}} messages"}')
        .mockResolvedValueOnce('{}');

      await ensureTranslationsLoaded();
      
      const result = translate('welcome', 'en', { name: 'John', count: 5 });
      expect(result).toBe('Hello John, you have 5 messages');
    });

    it('should fall back to English when requested language is not available', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('{"test":"English Value"}')
        .mockResolvedValueOnce('{}'); // Empty Japanese translations

      await ensureTranslationsLoaded();
      
      const result = translate('test', 'ja'); // Requesting Japanese but only English available
      expect(result).toBe('English Value');
    });

    it('should return key when translation is missing', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('{"existing":"value"}')
        .mockResolvedValueOnce('{}');

      await ensureTranslationsLoaded();
      
      const result = translate('missing.key', 'en');
      expect(result).toBe('missing.key');
    });
  });

  describe('error handling', () => {
    it('should handle missing locales directory gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory not found'));
      
      await ensureTranslationsLoaded();
      
      const result = translate('test.key', 'en');
      expect(result).toBe('test.key'); // Falls back to key
    });

    it('should handle invalid JSON gracefully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('invalid json')  // Invalid JSON
        .mockResolvedValueOnce('{"valid":"json"}');

      await ensureTranslationsLoaded();
      
      // Should still work with valid Japanese file
      const result = translate('valid', 'ja');
      expect(result).toBe('json');
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockRejectedValueOnce(new Error('File read error'))
        .mockResolvedValueOnce('{"test":"value"}');

      await ensureTranslationsLoaded();
      
      const result = translate('test', 'ja');
      expect(result).toBe('value'); // Falls back to available translation
    });
  });

  describe('caching behavior', () => {
    it('should not reload translations on subsequent calls', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile
        .mockResolvedValueOnce('{"test":"value"}')
        .mockResolvedValueOnce('{}');

      await ensureTranslationsLoaded();
      await ensureTranslationsLoaded(); // Second call
      
      // Should only call readFile once for each language
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });
});
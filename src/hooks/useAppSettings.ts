import { useEffect, useState } from 'react';

const GEMINI_KEY_STORAGE = 'fototraductor_gemini_api_key';
const PROVIDER_STORAGE = 'fototraductor_ai_provider';

export function useAppSettings() {
  const [apiKey, setApiKeyInternal] = useState<string>(() => {
    try {
      return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });

  const [provider, setProvider] = useState<string>(() => {
    try {
      return localStorage.getItem(PROVIDER_STORAGE) || 'gemini';
    } catch {
      return 'gemini';
    }
  });

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKeyInternal(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE);
      }
    } catch (err) {
      console.warn('Could not save API key to localStorage', err);
    }
  };

  const saveProvider = (newProvider: string) => {
    setProvider(newProvider);
    try {
      localStorage.setItem(PROVIDER_STORAGE, newProvider);
    } catch (err) {
      console.warn('Could not save provider to localStorage', err);
    }
  };

  return {
    apiKey,
    setApiKey: saveApiKey,
    hasApiKey: Boolean(apiKey),
    provider,
    setProvider: saveProvider,
  };
}

import { useState } from 'react';

const GEMINI_KEY_STORAGE = 'fototraductor_gemini_api_key';
const CF_ACCOUNT_STORAGE = 'fototraductor_cf_account_id';
const CF_TOKEN_STORAGE = 'fototraductor_cf_api_token';
const PROVIDER_STORAGE = 'fototraductor_ai_provider';

/** Preferred AI provider / cascade strategy */
export type AiProvider =
  | 'auto'           // Gemini → Cloudflare
  | 'gemini'         // Solo Gemini
  | 'cloudflare'     // Solo Cloudflare Workers AI
  | 'cloudflare_first'; // Cloudflare → Gemini

export function useAppSettings() {
  const [apiKey, setApiKeyInternal] = useState<string>(() => {
    try {
      return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });

  const [cfAccountId, setCfAccountIdInternal] = useState<string>(() => {
    try {
      return localStorage.getItem(CF_ACCOUNT_STORAGE) || '';
    } catch {
      return '';
    }
  });

  const [cfApiToken, setCfApiTokenInternal] = useState<string>(() => {
    try {
      return localStorage.getItem(CF_TOKEN_STORAGE) || '';
    } catch {
      return '';
    }
  });

  const [provider, setProviderInternal] = useState<AiProvider>(() => {
    try {
      const stored = localStorage.getItem(PROVIDER_STORAGE);
      if (
        stored === 'auto' ||
        stored === 'gemini' ||
        stored === 'cloudflare' ||
        stored === 'cloudflare_first'
      ) {
        return stored;
      }
      return 'auto';
    } catch {
      return 'auto';
    }
  });

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKeyInternal(trimmed);
    try {
      if (trimmed) localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
      else localStorage.removeItem(GEMINI_KEY_STORAGE);
    } catch (err) {
      console.warn('Could not save Gemini API key', err);
    }
  };

  const saveCfAccountId = (id: string) => {
    const trimmed = id.trim();
    setCfAccountIdInternal(trimmed);
    try {
      if (trimmed) localStorage.setItem(CF_ACCOUNT_STORAGE, trimmed);
      else localStorage.removeItem(CF_ACCOUNT_STORAGE);
    } catch (err) {
      console.warn('Could not save CF Account ID', err);
    }
  };

  const saveCfApiToken = (token: string) => {
    const trimmed = token.trim();
    setCfApiTokenInternal(trimmed);
    try {
      if (trimmed) localStorage.setItem(CF_TOKEN_STORAGE, trimmed);
      else localStorage.removeItem(CF_TOKEN_STORAGE);
    } catch (err) {
      console.warn('Could not save CF API Token', err);
    }
  };

  const saveProvider = (newProvider: AiProvider) => {
    setProviderInternal(newProvider);
    try {
      localStorage.setItem(PROVIDER_STORAGE, newProvider);
    } catch (err) {
      console.warn('Could not save provider', err);
    }
  };

  const hasGeminiKey = Boolean(apiKey);
  const hasCloudflareKeys = Boolean(cfAccountId && cfApiToken);
  const hasAnyKey = hasGeminiKey || hasCloudflareKeys;

  return {
    apiKey,
    setApiKey: saveApiKey,
    hasApiKey: hasGeminiKey, // backward-compat (Gemini)
    hasGeminiKey,
    cfAccountId,
    setCfAccountId: saveCfAccountId,
    cfApiToken,
    setCfApiToken: saveCfApiToken,
    hasCloudflareKeys,
    hasAnyKey,
    provider,
    setProvider: saveProvider,
  };
}

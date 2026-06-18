import type { BrandResult } from './types';
import { deriveMonogram, deterministicColor, normalizeToHostname } from './utils';

const LS_KEY = 'constellation:brand-cache:v1';

type BrandCache = Record<string, BrandResult>;

function readCache(): BrandCache {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as BrandCache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: BrandCache) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

function localFallback(input: string): BrandResult {
  return {
    logoUrl: null,
    color: deterministicColor(normalizeToHostname(input) || input),
    source: 'fallback',
    monogram: deriveMonogram(input),
  };
}

/**
 * Resolve brand info for a URL. Checks the localStorage cache first, then
 * calls the /api/brand route. Always resolves to a usable result.
 */
export async function resolveBrand(input: string): Promise<BrandResult> {
  const domain = normalizeToHostname(input);
  if (!domain) return localFallback(input);

  const cache = readCache();
  if (cache[domain]) return cache[domain];

  try {
    const res = await fetch(`/api/brand?url=${encodeURIComponent(input)}`);
    if (!res.ok) throw new Error(`brand api ${res.status}`);
    const data = (await res.json()) as BrandResult;
    cache[domain] = data;
    writeCache(cache);
    return data;
  } catch {
    return localFallback(input);
  }
}

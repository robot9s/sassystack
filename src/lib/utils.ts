/** A fixed pleasant palette used for deterministic fallback colors. */
export const FALLBACK_PALETTE = [
  '#D85A30', // coral (brand)
  '#E8A33D',
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#16a34a',
  '#a855f7',
  '#ec4899',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#0891b2',
];

/** Stable string hash (djb2). */
export function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Pick a deterministic color from the fixed palette based on a seed string. */
export function deterministicColor(seed: string): string {
  if (!seed) return FALLBACK_PALETTE[0];
  return FALLBACK_PALETTE[hashString(seed) % FALLBACK_PALETTE.length];
}

/**
 * Normalize arbitrary user input to a hostname.
 * Strips "www.", adds "https://" if no protocol is present.
 */
export function normalizeToHostname(input: string): string {
  if (!input) return '';
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const { hostname } = new URL(value);
    return hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

/** Ensure a URL has a protocol so it can be opened / parsed. */
export function ensureUrl(input: string): string {
  if (!input) return '';
  const value = input.trim();
  if (!/^https?:\/\//i.test(value)) return `https://${value}`;
  return value;
}

/** Human-friendly hostname for display (strips protocol + www + trailing slash). */
export function displayHostname(input: string): string {
  if (!input) return '';
  try {
    const url = new URL(ensureUrl(input));
    return url.hostname.replace(/^www\./i, '');
  } catch {
    return input.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  }
}

/**
 * Derive a 1-2 letter monogram from a domain or label.
 * "dashboard.stripe.com" -> "ST", "vercel.com" -> "VE".
 */
export function deriveMonogram(input: string): string {
  if (!input) return '?';
  const host = normalizeToHostname(input) || input.trim();
  // Take the registrable-ish part: the label before the TLD.
  const parts = host.split('.').filter(Boolean);
  let base = host;
  if (parts.length >= 2) {
    base = parts[parts.length - 2];
  } else if (parts.length === 1) {
    base = parts[0];
  }
  const clean = base.replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return '?';
  if (clean.length === 1) return clean.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

/** Default human label from a URL, e.g. "stripe.com" -> "Stripe". */
export function deriveLabel(input: string): string {
  const host = normalizeToHostname(input) || input.trim();
  const parts = host.split('.').filter(Boolean);
  let base = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || host;
  base = base.replace(/[^a-zA-Z0-9-]/g, ' ').replace(/-/g, ' ').trim();
  if (!base) return host || 'Service';
  return base
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Cheap unique id without external deps. */
export function genId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Format a billing chip label, e.g. "$25/mo". */
export function formatBilling(cost?: number, cycle?: string): string | null {
  if (cost == null || Number.isNaN(cost)) return null;
  const amount = Number.isInteger(cost) ? `$${cost}` : `$${cost.toFixed(2)}`;
  switch (cycle) {
    case 'annual':
      return `${amount}/yr`;
    case 'usage':
      return `${amount} usage`;
    case 'none':
      return amount;
    case 'monthly':
    default:
      return `${amount}/mo`;
  }
}

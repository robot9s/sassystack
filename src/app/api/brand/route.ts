import { NextResponse } from 'next/server';
import { Vibrant } from 'node-vibrant/node';
import type { BrandResult } from '@/lib/types';
import { deriveMonogram, deterministicColor, normalizeToHostname } from '@/lib/utils';

export const runtime = 'nodejs';

// Per-session in-memory cache keyed by domain.
const cache = new Map<string, BrandResult>();

const HEX = /^#?[0-9a-fA-F]{6}$/;

function normalizeHex(value: string | undefined | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (HEX.test(v)) return v.startsWith('#') ? v.toLowerCase() : `#${v.toLowerCase()}`;
  return null;
}

/** Fetch bytes for an icon URL and pull a dominant color via node-vibrant. */
async function colorFromImage(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Constellation)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;
    const palette = await Vibrant.from(buf).getPalette();
    const swatch =
      palette.Vibrant ||
      palette.DarkVibrant ||
      palette.Muted ||
      palette.LightVibrant ||
      palette.DarkMuted ||
      palette.LightMuted;
    return swatch ? swatch.hex : null;
  } catch {
    return null;
  }
}

/** Confirm a remote URL actually returns an image. */
async function urlReturnsImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Constellation)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    return type.startsWith('image/');
  } catch {
    return false;
  }
}

async function resolveBrand(domain: string): Promise<BrandResult> {
  const monogram = deriveMonogram(domain);
  let logoUrl: string | null = null;
  let color: string | null = null;
  let source = 'fallback';

  // 1. Brandfetch
  const brandfetchKey = process.env.BRANDFETCH_API_KEY;
  if (brandfetchKey) {
    try {
      const res = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
        headers: { Authorization: `Bearer ${brandfetchKey}` },
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          logos?: { formats?: { src?: string }[]; type?: string }[];
          colors?: { hex?: string; type?: string }[];
        };
        const logo =
          data.logos?.find((l) => l.type === 'icon') ||
          data.logos?.find((l) => l.type === 'logo') ||
          data.logos?.[0];
        const src = logo?.formats?.find((f) => f.src)?.src;
        if (src) {
          logoUrl = src;
          source = 'brandfetch';
        }
        const brandColor =
          data.colors?.find((c) => c.type === 'brand') || data.colors?.[0];
        color = normalizeHex(brandColor?.hex);
      }
    } catch {
      // fall through
    }
  }

  // 2. Logo.dev
  if (!logoUrl) {
    const logodev = process.env.LOGODEV_TOKEN;
    if (logodev) {
      logoUrl = `https://img.logo.dev/${domain}?token=${logodev}&size=128&format=png`;
      source = 'logo.dev';
    }
  }

  // 3. Favicon services (no API key needed).
  if (!logoUrl) {
    const google = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    if (await urlReturnsImage(google)) {
      logoUrl = google;
      source = 'google-favicon';
    } else {
      const ddg = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      if (await urlReturnsImage(ddg)) {
        logoUrl = ddg;
        source = 'duckduckgo-favicon';
      }
    }
  }

  // 4. Dominant color from the chosen icon.
  if (!color && logoUrl) {
    color = await colorFromImage(logoUrl);
  }

  // 5. Final fallback: deterministic color from domain.
  if (!color) {
    color = deterministicColor(domain);
  }

  return { logoUrl, color, source, monogram };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('url');

  if (!raw) {
    return NextResponse.json(
      { error: 'Missing ?url parameter' },
      { status: 400 },
    );
  }

  const domain = normalizeToHostname(raw);

  if (!domain) {
    // Even with bad input, return something usable.
    const fallback: BrandResult = {
      logoUrl: null,
      color: deterministicColor(raw),
      source: 'fallback',
      monogram: deriveMonogram(raw),
    };
    return NextResponse.json(fallback);
  }

  const cached = cache.get(domain);
  if (cached) {
    return NextResponse.json(cached);
  }

  const result = await resolveBrand(domain);
  cache.set(domain, result);

  return NextResponse.json(result);
}

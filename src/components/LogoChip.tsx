'use client';

import { useState } from 'react';

interface LogoChipProps {
  logoUrl?: string | null;
  color?: string;
  monogram?: string;
  size?: number;
  rounded?: number;
}

/**
 * Renders a brand logo, or a color-filled square with a monogram when no logo
 * is available or the image fails to load. Never shows a broken image.
 */
export default function LogoChip({
  logoUrl,
  color = '#64748b',
  monogram = '?',
  size = 30,
  rounded = 8,
}: LogoChipProps) {
  const [errored, setErrored] = useState(false);
  const showImage = logoUrl && !errored;

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        background: showImage ? '#fff' : color,
        border: showImage ? '1px solid #eef0f2' : 'none',
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={monogram}
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => setErrored(true)}
        />
      ) : (
        <span
          className="font-semibold text-white"
          style={{ fontSize: size * 0.42, lineHeight: 1 }}
        >
          {monogram}
        </span>
      )}
    </div>
  );
}

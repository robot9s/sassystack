'use client';

/**
 * Shared arrowhead marker definitions referenced by edges via url(#id).
 * Markers use `context-stroke` so the arrow color always matches the edge's
 * stroke (including the coral highlight when selected). Rendered once.
 */
export default function EdgeMarkers() {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <marker
          id="cs-arrow"
          viewBox="0 0 12 12"
          refX="9"
          refY="6"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M1 1 L10 6 L1 11 z" fill="context-stroke" />
        </marker>
        <marker
          id="cs-arrow-sm"
          viewBox="0 0 12 12"
          refX="9"
          refY="6"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M2 2 L10 6 L2 10"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
    </svg>
  );
}

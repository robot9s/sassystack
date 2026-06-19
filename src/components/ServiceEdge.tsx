'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { BoardEdge, EdgeStyle } from '@/lib/types';
import { resolveEdgeStyle } from '@/lib/types';

const BASE_COLORS: Record<EdgeStyle, string> = {
  standard: '#64748b',
  dashed: '#64748b',
  bidirectional: '#64748b',
  dependency: '#a3a3a3',
  animated: '#0ea5e9',
};

const DASH: Partial<Record<EdgeStyle, string>> = {
  dashed: '6 4',
  dependency: '2 4',
  animated: '8 7',
};

export default function ServiceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<BoardEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const style = resolveEdgeStyle(data);
  const flowing = style === 'animated';
  const showDot = flowing || data?.animated === true;

  const color = selected ? '#d85a30' : BASE_COLORS[style];
  const strokeWidth = (style === 'dependency' ? 1.5 : 2) + (selected ? 0.75 : 0);

  const markerEnd =
    style === 'dependency' ? 'url(#cs-arrow-sm)' : 'url(#cs-arrow)';
  const markerStart =
    style === 'bidirectional' ? 'url(#cs-arrow)' : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        className={flowing ? 'cs-edge-flow' : undefined}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray: DASH[style],
        }}
      />

      {showDot && (
        <circle r={3.4} fill={color}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className={`nodrag nopan pointer-events-none absolute rounded-full border bg-white px-2 py-0.5 text-[10px] font-medium shadow-sm ${
              selected
                ? 'border-coral-300 text-coral-700'
                : 'border-slate-200 text-slate-600'
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

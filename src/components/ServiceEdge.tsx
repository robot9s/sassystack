'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { BoardEdge, EdgeKind } from '@/lib/types';

const KIND_STYLES: Record<EdgeKind, { stroke: string; dash?: string }> = {
  link: { stroke: '#94a3b8' },
  data: { stroke: '#0ea5e9', dash: '6 4' },
  auth: { stroke: '#a855f7', dash: '2 3' },
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

  const kind: EdgeKind = data?.kind ?? 'link';
  const style = KIND_STYLES[kind];

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#d85a30' : style.stroke,
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: style.dash,
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm"
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

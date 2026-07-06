'use client';

import { memo, useCallback } from 'react';
import { type NodeProps, useReactFlow } from '@xyflow/react';
import type { BoardNode, ContainerNodeData } from '@/lib/types';
import { CONTAINER_DEFAULT_HEIGHT, CONTAINER_DEFAULT_WIDTH } from '@/lib/types';
import { ensureUrl, formatBilling } from '@/lib/utils';
import { useStore } from '@/lib/store';
import LogoChip from './LogoChip';

const MIN_W = 180;
const MIN_H = 120;

function ContainerNodeComponent({ id, data, selected }: NodeProps<BoardNode>) {
  const d = data as ContainerNodeData;
  const updateNode = useStore((s) => s.updateNode);
  const setSelectedNode = useStore((s) => s.setSelectedNode);
  const { getViewport } = useReactFlow();

  const width = d.width ?? CONTAINER_DEFAULT_WIDTH;
  const height = d.height ?? CONTAINER_DEFAULT_HEIGHT;
  const color = d.color || '#94a3b8';
  const billing = formatBilling(d.billing?.cost, d.billing?.cycle);

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const start = {
        x: e.clientX,
        y: e.clientY,
        w: width,
        h: height,
        zoom: getViewport().zoom || 1,
      };
      const move = (ev: PointerEvent) => {
        const dx = (ev.clientX - start.x) / start.zoom;
        const dy = (ev.clientY - start.y) / start.zoom;
        updateNode(id, {
          width: Math.max(MIN_W, Math.round(start.w + dx)),
          height: Math.max(MIN_H, Math.round(start.h + dy)),
        });
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [width, height, getViewport, updateNode, id],
  );

  const openUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (d.url) window.open(ensureUrl(d.url), '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`group relative rounded-2xl border-2 transition-colors ${
        selected ? 'border-coral-400' : 'border-dashed'
      }`}
      style={{
        width,
        height,
        borderColor: selected ? undefined : color,
        background: `${color}14`, // ~8% tint
      }}
    >
      {/* Title bar */}
      <div
        className="absolute -top-px left-0 right-0 flex items-center gap-2 rounded-t-2xl px-3 py-2"
        style={{ background: `${color}22` }}
      >
        <LogoChip
          logoUrl={d.logoUrl}
          color={color}
          monogram={d.monogram || (d.label?.[0]?.toUpperCase() ?? 'G')}
          size={22}
          rounded={6}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
          {d.label || 'Group'}
        </span>
        {billing && (
          <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-coral-700 dark:bg-slate-900/60 dark:text-coral-400">
            {billing}
          </span>
        )}
        {d.url && (
          <button
            onClick={openUrl}
            className="rounded p-1 text-slate-400 hover:bg-white/60 hover:text-coral-600"
            title="Open link"
            aria-label="Open link"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6M10 14 21 3" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNode(id);
          }}
          className="rounded p-1 text-slate-400 hover:bg-white/60 hover:text-coral-600"
          title="Edit group"
          aria-label="Edit group"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      </div>

      {/* Resize grip */}
      <div
        className="nodrag absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
        onPointerDown={onResizeStart}
        title="Resize"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          className="text-slate-400"
          style={{ position: 'absolute', right: 1, bottom: 1 }}
        >
          <path d="M11 3 3 11M11 7l-4 4M11 11h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export default memo(ContainerNodeComponent);

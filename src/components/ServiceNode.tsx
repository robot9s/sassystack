'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BoardNode } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';
import { displayHostname, ensureUrl, formatBilling } from '@/lib/utils';
import { useStore } from '@/lib/store';
import LogoChip from './LogoChip';

function ServiceNodeComponent({ id, data, selected }: NodeProps<BoardNode>) {
  const setSelectedNode = useStore((s) => s.setSelectedNode);

  const color = data.color || '#64748b';
  const host = displayHostname(data.url ?? '');
  const billing = formatBilling(data.billing?.cost, data.billing?.cycle);
  const categoryColor = data.category ? CATEGORY_COLORS[data.category] : null;

  const openUrl = () => {
    if (!data.url) return;
    window.open(ensureUrl(data.url), '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`group relative flex w-[230px] items-center gap-3 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md ${
        selected ? 'border-coral-500 ring-2 ring-coral-200' : 'border-slate-200'
      }`}
      style={{ borderLeft: `4px solid ${color}` }}
      onDoubleClick={openUrl}
      title={data.url ? `Double-click to open ${host}` : undefined}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5"
      />

      <LogoChip
        logoUrl={data.logoUrl}
        color={color}
        monogram={data.monogram}
        size={32}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-slate-900">
            {data.label || 'Untitled'}
          </span>
          {categoryColor && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: categoryColor }}
              title={data.category}
            />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs text-slate-400">{host || 'no url'}</span>
          {billing && (
            <span className="shrink-0 rounded bg-coral-50 px-1.5 py-0.5 text-[10px] font-medium text-coral-700">
              {billing}
            </span>
          )}
        </div>
      </div>

      {/* Edit button (visible on hover / selection) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(id);
        }}
        className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-opacity hover:text-coral-600 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Edit details"
        aria-label="Edit node"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5"
      />
    </div>
  );
}

export default memo(ServiceNodeComponent);

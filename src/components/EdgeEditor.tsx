'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { EDGE_LABEL_PRESETS, EDGE_STYLES, resolveEdgeStyle } from '@/lib/types';

interface EdgeEditorProps {
  edgeId: string;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

const PANEL_W = 264;

export default function EdgeEditor({ edgeId, screenX, screenY, onClose }: EdgeEditorProps) {
  const edge = useStore((s) =>
    s.boards
      .find((b) => b.id === s.activeBoardId)
      ?.edges.find((e) => e.id === edgeId),
  );
  const updateEdge = useStore((s) => s.updateEdge);
  const reverseEdge = useStore((s) => s.reverseEdge);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const [label, setLabel] = useState(edge?.data?.label ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Edge was deleted elsewhere — nothing to edit.
  useEffect(() => {
    if (!edge) onClose();
  }, [edge, onClose]);

  if (!edge) return null;

  const style = resolveEdgeStyle(edge.data);
  const animated = edge.data?.animated === true;

  const left = Math.max(
    8,
    Math.min(
      screenX,
      (typeof window !== 'undefined' ? window.innerWidth : 9999) - PANEL_W - 8,
    ),
  );
  const top = Math.min(
    screenY,
    (typeof window !== 'undefined' ? window.innerHeight : 9999) - 360,
  );

  const setLabelValue = (value: string) => {
    setLabel(value);
    updateEdge(edge.id, { label: value.trim() || undefined });
  };

  return (
    <div
      ref={ref}
      className="fixed z-[80] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"
      style={{ left, top, width: PANEL_W }}
    >
      <div className="mb-1 text-xs font-medium text-slate-500">Label</div>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabelValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onClose();
        }}
        placeholder="e.g. webhooks"
        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-200"
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {EDGE_LABEL_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setLabelValue(preset)}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              label === preset
                ? 'border-coral-400 bg-coral-50 text-coral-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="mb-1 mt-3 text-xs font-medium text-slate-500">Style</div>
      <div className="grid grid-cols-2 gap-1.5">
        {EDGE_STYLES.map((s) => (
          <button
            key={s.value}
            onClick={() => updateEdge(edge.id, { style: s.value })}
            title={s.hint}
            className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
              style === s.value
                ? 'border-coral-500 bg-coral-50 text-coral-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => updateEdge(edge.id, { animated: !animated })}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium ${
            animated
              ? 'border-sky-400 bg-sky-50 text-sky-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${animated ? 'bg-sky-500' : 'bg-slate-300'}`}
          />
          {animated ? 'Animation on' : 'Animation off'}
        </button>
        <button
          onClick={() => reverseEdge(edge.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          title="Reverse direction"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m17 2 4 4-4 4" />
            <path d="M3 6h18" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 18H3" />
          </svg>
          Reverse
        </button>
      </div>

      <button
        onClick={() => {
          deleteEdge(edge.id);
          onClose();
        }}
        className="mt-3 w-full rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Delete edge
      </button>
    </div>
  );
}

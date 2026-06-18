'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import type { BoardEdge, EdgeKind } from '@/lib/types';

interface EdgeEditorProps {
  edge: BoardEdge;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

const KINDS: { value: EdgeKind; label: string }[] = [
  { value: 'link', label: 'Link' },
  { value: 'data', label: 'Data' },
  { value: 'auth', label: 'Auth' },
];

export default function EdgeEditor({ edge, screenX, screenY, onClose }: EdgeEditorProps) {
  const updateEdge = useStore((s) => s.updateEdge);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const [label, setLabel] = useState(edge.data?.label ?? '');
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

  const kind: EdgeKind = edge.data?.kind ?? 'link';

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"
      style={{
        left: Math.min(screenX, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 240),
        top: screenY,
      }}
    >
      <div className="mb-1 text-xs font-medium text-slate-500">Edge label</div>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => updateEdge(edge.id, { label: label.trim() || undefined })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            updateEdge(edge.id, { label: label.trim() || undefined });
            onClose();
          }
        }}
        placeholder="e.g. webhooks"
        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-200"
      />

      <div className="mb-1 mt-3 text-xs font-medium text-slate-500">Kind</div>
      <div className="flex gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.value}
            onClick={() => updateEdge(edge.id, { kind: k.value })}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
              kind === k.value
                ? 'border-coral-500 bg-coral-50 text-coral-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {k.label}
          </button>
        ))}
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

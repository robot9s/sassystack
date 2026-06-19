'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { BoardNode, NoteNodeData } from '@/lib/types';
import { useStore } from '@/lib/store';

function NoteNodeComponent({ id, data, selected }: NodeProps<BoardNode>) {
  const d = data as NoteNodeData;
  const updateNode = useStore((s) => s.updateNode);
  const [editing, setEditing] = useState(!d.text); // start editing if empty
  const [draft, setDraft] = useState(d.text ?? '');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const fontSize = d.fontSize ?? 16;
  const color = d.color || '#1c1917';

  useEffect(() => {
    if (editing) {
      const ta = taRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }
  }, [editing]);

  const commit = () => {
    updateNode(id, { text: draft });
    setEditing(false);
  };

  if (editing) {
    return (
      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            commit();
          }
          // Enter inserts newlines; Cmd/Ctrl+Enter commits
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
        }}
        className="nodrag nowheel resize-none rounded-md border border-coral-300 bg-white/90 px-2 py-1 shadow-sm outline-none focus:ring-2 focus:ring-coral-200"
        style={{
          fontSize,
          color,
          minWidth: 120,
          width: Math.max(120, draft.length * (fontSize * 0.55)),
          height: Math.max(fontSize * 2, (draft.split('\n').length + 1) * fontSize * 1.4),
          lineHeight: 1.4,
        }}
        placeholder="Type a note…"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => {
        setDraft(d.text ?? '');
        setEditing(true);
      }}
      className={`cursor-text whitespace-pre-wrap rounded-md px-2 py-1 ${
        selected ? 'outline-dashed outline-2 outline-offset-2 outline-coral-300' : ''
      }`}
      style={{ fontSize, color, lineHeight: 1.4, minWidth: 24, minHeight: fontSize }}
      title="Double-click to edit"
    >
      {d.text || <span className="text-slate-400">Double-click to edit…</span>}
    </div>
  );
}

export default memo(NoteNodeComponent);

'use client';

import { useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '@/lib/store';
import { resolveBrand } from '@/lib/brand-client';
import { deriveLabel, ensureUrl } from '@/lib/utils';

interface AddNodeDialogProps {
  onClose: () => void;
  /** Optional flow-coordinate position to drop the node at. */
  dropPosition?: { x: number; y: number } | null;
}

export default function AddNodeDialog({ onClose, dropPosition }: AddNodeDialogProps) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addNode = useStore((s) => s.addNode);
  const { screenToFlowPosition, getViewport } = useReactFlow();

  const centerOfViewport = () => {
    if (dropPosition) return dropPosition;
    if (typeof window !== 'undefined') {
      return screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }
    const vp = getViewport();
    return { x: -vp.x + 300, y: -vp.y + 200 };
  };

  const submit = async (keepOpen: boolean) => {
    const url = value.trim();
    if (!url || busy) return;
    setBusy(true);
    try {
      const brand = await resolveBrand(url);
      const pos = centerOfViewport();
      // slight offset for each successive add so they don't stack exactly
      const jitter = lastAdded ? { x: 36, y: 28 } : { x: 0, y: 0 };
      addNode(
        {
          label: deriveLabel(url),
          url: ensureUrl(url),
          logoUrl: brand.logoUrl,
          color: brand.color,
          monogram: brand.monogram,
          billing: { cycle: 'monthly' },
        },
        { x: pos.x + jitter.x, y: pos.y + jitter.y },
      );
      setLastAdded(url);
      setValue('');
      if (keepOpen) {
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-slate-900/30 pt-[18vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[440px] max-w-[92vw] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">Add a service</h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Paste a URL — we&apos;ll grab the logo and brand color automatically.
        </p>
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Cmd/Ctrl+Enter closes after add; plain Enter keeps open for rapid adds
              submit(!(e.metaKey || e.ctrlKey));
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder="stripe.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-coral-900"
        />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {busy
              ? 'Resolving logo…'
              : lastAdded
                ? 'Added — enter another, or Esc to close'
                : 'Press Enter to add'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={busy || !value.trim()}
              className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

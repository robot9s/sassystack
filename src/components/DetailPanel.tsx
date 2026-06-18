'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { resolveBrand } from '@/lib/brand-client';
import { CATEGORIES, type BillingCycle, type ServiceNodeData } from '@/lib/types';
import { displayHostname, ensureUrl } from '@/lib/utils';
import LogoChip from './LogoChip';

const CYCLES: BillingCycle[] = ['monthly', 'annual', 'usage', 'none'];

export default function DetailPanel() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const setSelectedNode = useStore((s) => s.setSelectedNode);
  const updateNode = useStore((s) => s.updateNode);
  const deleteNode = useStore((s) => s.deleteNode);
  const board = useStore((s) => s.boards.find((b) => b.id === s.activeBoardId));

  const node = board?.nodes.find((n) => n.id === selectedNodeId);

  const [reResolving, setReResolving] = useState(false);

  if (!node) return null;

  const data = node.data;

  const commit = (patch: Partial<ServiceNodeData>) => updateNode(node.id, patch);

  const commitBilling = (
    patch: Partial<NonNullable<ServiceNodeData['billing']>>,
  ) => updateNode(node.id, { billing: { ...data.billing, ...patch } });

  const reResolveLogo = async () => {
    const url = data.url?.trim();
    if (!url) return;
    setReResolving(true);
    try {
      const brand = await resolveBrand(url);
      commit({
        logoUrl: brand.logoUrl,
        color: brand.color,
        monogram: brand.monogram,
      });
    } finally {
      setReResolving(false);
    }
  };

  const close = () => setSelectedNode(null);

  return (
    <aside className="absolute right-0 top-0 z-30 flex h-full w-[340px] max-w-[90vw] flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <LogoChip
            logoUrl={data.logoUrl}
            color={data.color}
            monogram={data.monogram}
            size={28}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {data.label || 'Untitled'}
            </div>
            <div className="truncate text-xs text-slate-400">
              {displayHostname(data.url)}
            </div>
          </div>
        </div>
        <button
          onClick={close}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Field label="Name">
          <input
            value={data.label}
            onChange={(e) => commit({ label: e.target.value })}
            className={inputCls}
          />
        </Field>

        <Field label="URL">
          <input
            value={data.url}
            onChange={(e) => commit({ url: e.target.value })}
            className={inputCls}
            placeholder="https://…"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <button
              onClick={reResolveLogo}
              disabled={reResolving}
              className="text-xs font-medium text-coral-600 hover:text-coral-700 disabled:opacity-50"
            >
              {reResolving ? 'Re-resolving…' : '↻ Re-resolve logo'}
            </button>
            {data.url && (
              <a
                href={ensureUrl(data.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Open ↗
              </a>
            )}
          </div>
        </Field>

        <Field label="Category">
          <select
            value={data.category ?? ''}
            onChange={(e) => commit({ category: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">— none —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Notes">
          <textarea
            value={data.notes ?? ''}
            onChange={(e) => commit({ notes: e.target.value })}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="Anything worth remembering…"
          />
        </Field>

        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Billing
          </div>
          <div className="space-y-3">
            <Field label="Plan">
              <input
                value={data.billing?.plan ?? ''}
                onChange={(e) => commitBilling({ plan: e.target.value })}
                className={inputCls}
                placeholder="Pro, Team, …"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cost ($)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={data.billing?.cost ?? ''}
                  onChange={(e) =>
                    commitBilling({
                      cost:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                  placeholder="0"
                />
              </Field>
              <Field label="Cycle">
                <select
                  value={data.billing?.cycle ?? 'monthly'}
                  onChange={(e) =>
                    commitBilling({ cycle: e.target.value as BillingCycle })
                  }
                  className={inputCls}
                >
                  {CYCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Next charge">
              <input
                type="date"
                value={data.billing?.nextCharge ?? ''}
                onChange={(e) => commitBilling({ nextCharge: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            Manual metadata only — not connected to any payment provider.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        <button
          onClick={() => deleteNode(node.id)}
          className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete node
        </button>
      </div>
    </aside>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-200';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

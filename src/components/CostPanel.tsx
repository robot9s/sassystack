'use client';

import { useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '@/lib/store';
import type { BoardNode } from '@/lib/types';
import { CONTAINER_DEFAULT_HEIGHT, CONTAINER_DEFAULT_WIDTH } from '@/lib/types';
import { daysUntil, formatMoney, monthlyEquivalent } from '@/lib/utils';
import LogoChip from './LogoChip';

interface CostPanelProps {
  onClose: () => void;
}

interface CostItem {
  node: BoardNode;
  cost: number;
  cycle: string;
  monthly: number | null; // null = one-time
  nextCharge?: string;
}

export default function CostPanel({ onClose }: CostPanelProps) {
  const board = useStore((s) => s.boards.find((b) => b.id === s.activeBoardId));
  const setSelectedNode = useStore((s) => s.setSelectedNode);
  const { setCenter } = useReactFlow();

  const items: CostItem[] = useMemo(() => {
    const nodes = board?.nodes ?? [];
    return nodes
      .filter(
        (n) =>
          (n.type === 'service' || n.type === 'container') &&
          n.data.billing?.cost != null &&
          !Number.isNaN(n.data.billing.cost),
      )
      .map((n) => ({
        node: n,
        cost: n.data.billing!.cost!,
        cycle: n.data.billing?.cycle ?? 'monthly',
        monthly: monthlyEquivalent(n.data.billing?.cost, n.data.billing?.cycle),
        nextCharge: n.data.billing?.nextCharge || undefined,
      }))
      .sort((a, b) => (b.monthly ?? 0) - (a.monthly ?? 0));
  }, [board?.nodes]);

  const totalMonthly = items.reduce((sum, i) => sum + (i.monthly ?? 0), 0);
  const totalYearly = items.reduce((sum, i) => {
    if (i.monthly == null) return sum;
    return sum + (i.cycle === 'annual' ? i.cost : i.cost * 12);
  }, 0);
  const oneTime = items.filter((i) => i.monthly == null);

  const renewals = useMemo(
    () =>
      items
        .filter((i) => i.nextCharge && daysUntil(i.nextCharge) != null)
        .sort((a, b) => daysUntil(a.nextCharge!)! - daysUntil(b.nextCharge!)!)
        .slice(0, 8),
    [items],
  );

  const focusNode = (node: BoardNode) => {
    const w =
      node.type === 'container'
        ? node.data.width ?? CONTAINER_DEFAULT_WIDTH
        : 230;
    const h =
      node.type === 'container'
        ? node.data.height ?? CONTAINER_DEFAULT_HEIGHT
        : 56;
    // Children store relative positions — resolve to absolute for centering.
    const parent = node.parentId
      ? board?.nodes.find((n) => n.id === node.parentId)
      : undefined;
    const x = (parent?.position.x ?? 0) + node.position.x + w / 2;
    const y = (parent?.position.y ?? 0) + node.position.y + h / 2;
    setCenter(x, y, { zoom: 1.3, duration: 500 });
    setSelectedNode(node.id);
  };

  return (
    <aside className="absolute left-0 top-0 z-30 flex h-full w-[320px] max-w-[90vw] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Stack costs
          </div>
          <div className="text-xs text-slate-400">
            {board?.name ?? ''} · {items.length} billed{' '}
            {items.length === 1 ? 'item' : 'items'}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Close costs panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Totals */}
        <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          <div className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {formatMoney(totalMonthly)}
            <span className="text-base font-normal text-slate-400">/mo</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            ≈ {formatMoney(totalYearly)}/yr recurring
            {oneTime.length > 0 &&
              ` · ${oneTime.length} one-time item${oneTime.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {/* Upcoming renewals */}
        {renewals.length > 0 && (
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Upcoming charges
            </div>
            <div className="space-y-1.5">
              {renewals.map((item) => {
                const days = daysUntil(item.nextCharge!)!;
                const soon = days >= 0 && days <= 7;
                const overdue = days < 0;
                return (
                  <button
                    key={item.node.id}
                    onClick={() => focusNode(item.node)}
                    className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        overdue
                          ? 'bg-red-500'
                          : soon
                            ? 'bg-coral-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                      {item.node.data.label || 'Untitled'}
                    </span>
                    <span
                      className={`shrink-0 text-xs ${
                        soon || overdue
                          ? 'font-medium text-coral-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {overdue
                        ? `${-days}d overdue`
                        : days === 0
                          ? 'today'
                          : `in ${days}d`}
                      {' · '}
                      {formatMoney(item.cost)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cost breakdown */}
        <div className="px-4 py-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Breakdown
          </div>
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs leading-relaxed text-slate-400">
              No billing info yet. Select a node or container and add a cost in
              its Billing section — it&apos;ll roll up here.
            </p>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.node.id}
                  onClick={() => focusNode(item.node)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <LogoChip
                    logoUrl={item.node.data.logoUrl}
                    color={item.node.data.color}
                    monogram={
                      item.node.data.monogram || item.node.data.label?.[0]
                    }
                    size={24}
                    rounded={6}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-700 dark:text-slate-200">
                      {item.node.data.label || 'Untitled'}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {item.node.type === 'container' ? 'container' : 'service'}
                      {item.node.data.billing?.plan
                        ? ` · ${item.node.data.billing.plan}`
                        : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                      {item.monthly != null
                        ? `${formatMoney(item.monthly)}/mo`
                        : formatMoney(item.cost)}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {item.cycle === 'annual'
                        ? `${formatMoney(item.cost)}/yr`
                        : item.cycle === 'usage'
                          ? 'usage est.'
                          : item.cycle === 'none'
                            ? 'one-time'
                            : 'monthly'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2.5 text-[10px] leading-relaxed text-slate-400 dark:border-slate-800">
        Annual plans are shown as their monthly equivalent. Usage-based costs
        are treated as monthly estimates.
      </div>
    </aside>
  );
}

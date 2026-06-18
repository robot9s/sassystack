'use client';

interface EmptyStateProps {
  onAddNode: () => void;
}

export default function EmptyState({ onAddNode }: EmptyStateProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-coral-500 text-xl text-white">
          ✦
        </div>
        <h2 className="mb-1.5 text-lg font-semibold text-slate-900">
          Map out your stack
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-slate-500">
          Add the services your project runs on — GitHub, Railway, Stripe, your
          domain — and connect them to see how everything fits together.
        </p>
        <button
          onClick={onAddNode}
          className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600"
        >
          + Add your first service
        </button>
        <p className="mt-3 text-xs text-slate-400">
          Tip: double-click anywhere on the canvas to drop a node.
        </p>
      </div>
    </div>
  );
}

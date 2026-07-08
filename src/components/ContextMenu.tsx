'use client';

import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const MENU_W = 184;

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('contextmenu', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('contextmenu', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const left = Math.min(
    x,
    (typeof window !== 'undefined' ? window.innerWidth : 9999) - MENU_W - 8,
  );
  const top = Math.min(
    y,
    (typeof window !== 'undefined' ? window.innerHeight : 9999) - items.length * 38 - 16,
  );

  return (
    <div
      ref={ref}
      className="fixed z-[80] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      style={{ left, top, width: MENU_W }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          disabled={item.disabled}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
            item.disabled
              ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
              : item.danger
                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          {item.icon && (
            <span className={item.danger && !item.disabled ? '' : 'text-slate-400'}>
              {item.icon}
            </span>
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
}

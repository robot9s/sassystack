'use client';

import { Panel } from '@xyflow/react';

const ITEMS: { label: string; color: string; dash?: string }[] = [
  { label: 'Link', color: '#94a3b8' },
  { label: 'Data', color: '#0ea5e9', dash: '6 4' },
  { label: 'Auth', color: '#a855f7', dash: '2 3' },
];

export default function EdgeLegend() {
  return (
    <Panel position="bottom-left">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <svg width="22" height="6">
              <line
                x1="0"
                y1="3"
                x2="22"
                y2="3"
                stroke={item.color}
                strokeWidth="2"
                strokeDasharray={item.dash}
              />
            </svg>
            <span className="text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

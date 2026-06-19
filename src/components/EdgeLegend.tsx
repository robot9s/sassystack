'use client';

import { Panel } from '@xyflow/react';

const ITEMS: { label: string; color: string; dash?: string; flow?: boolean }[] = [
  { label: 'Standard', color: '#64748b' },
  { label: 'Dashed', color: '#64748b', dash: '6 4' },
  { label: 'Dependency', color: '#a3a3a3', dash: '2 4' },
  { label: 'Data flow', color: '#0ea5e9', dash: '8 7', flow: true },
];

export default function EdgeLegend() {
  return (
    <Panel position="bottom-left">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
        {ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <svg width="22" height="6" className="overflow-visible">
              <line
                x1="0"
                y1="3"
                x2="22"
                y2="3"
                stroke={item.color}
                strokeWidth="2"
                strokeDasharray={item.dash}
                className={item.flow ? 'cs-edge-flow' : undefined}
              />
            </svg>
            <span className="text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

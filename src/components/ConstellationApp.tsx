'use client';

import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ensureSeedBoard, useHydrated, useStore } from '@/lib/store';
import TopBar from './TopBar';
import Canvas from './Canvas';
import DetailPanel from './DetailPanel';
import CommandPalette from './CommandPalette';
import AddNodeDialog from './AddNodeDialog';

export default function ConstellationApp() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const addBoard = useStore((s) => s.addBoard);
  const hydrated = useHydrated();

  // Seed a default board once the persisted store has hydrated.
  useEffect(() => {
    if (hydrated) ensureSeedBoard();
  }, [hydrated]);

  // Global ⌘K / Ctrl-K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const openAdd = (position?: { x: number; y: number }) => {
    setDropPosition(position ?? null);
    setAddOpen(true);
  };

  const handleNewBoard = () => {
    const name = window.prompt('New board name', 'New Board');
    if (name !== null) addBoard(name || 'New Board');
  };

  if (!hydrated) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--background)] text-sm text-slate-400">
        Loading Constellation…
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full flex-col">
        <TopBar onAddNode={() => openAdd()} onOpenPalette={() => setPaletteOpen(true)} />
        <div className="relative flex-1 overflow-hidden">
          <Canvas onRequestAdd={openAdd} />
          <DetailPanel />
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAddNode={() => openAdd()}
        onNewBoard={handleNewBoard}
      />

      {addOpen && (
        <AddNodeDialog onClose={() => setAddOpen(false)} dropPosition={dropPosition} />
      )}
    </ReactFlowProvider>
  );
}

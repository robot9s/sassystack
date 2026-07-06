'use client';

import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ensureSeedBoard, useHydrated, useStore } from '@/lib/store';
import TopBar from './TopBar';
import Canvas from './Canvas';
import DetailPanel from './DetailPanel';
import CostPanel from './CostPanel';
import CommandPalette from './CommandPalette';
import AddNodeDialog from './AddNodeDialog';

/** True when focus is in an input, textarea, select, or contentEditable. */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

export default function ConstellationApp() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [costsOpen, setCostsOpen] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const addBoard = useStore((s) => s.addBoard);
  const theme = useStore((s) => s.theme);
  const hydrated = useHydrated();

  // Seed a default board once the persisted store has hydrated.
  useEffect(() => {
    if (hydrated) ensureSeedBoard();
  }, [hydrated]);

  // Apply the persisted theme to the document root.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Search: ⌘K anywhere, "/" when not typing.
      if (meta && key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === '/' && !meta && !e.altKey && !isEditableTarget(e.target)) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // Everything below must not fire while typing.
      if (isEditableTarget(e.target)) return;
      const store = useStore.getState();

      if (meta && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (meta && key === 'd') {
        const board = store.getActiveBoard();
        const selected = board?.nodes.filter((n) => n.selected).map((n) => n.id) ?? [];
        if (selected.length) {
          e.preventDefault();
          store.duplicateNodes(selected);
        }
        return;
      }
      if (meta && key === 'c') {
        // Only intercept when canvas nodes are selected, so normal text
        // copying elsewhere on the page keeps working.
        if (store.copySelection() > 0) e.preventDefault();
        return;
      }
      if (meta && key === 'v') {
        if (store.pasteClipboard()) e.preventDefault();
        return;
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
        <TopBar
          onAddNode={() => openAdd()}
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleCosts={() => setCostsOpen((o) => !o)}
        />
        <div className="relative flex-1 overflow-hidden">
          <Canvas onRequestAdd={openAdd} />
          {costsOpen && <CostPanel onClose={() => setCostsOpen(false)} />}
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

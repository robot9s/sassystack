'use client';

import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '@/lib/store';
import { downloadJson, exportCanvasPng, readJsonFile } from '@/lib/io';
import { formatMoney, monthlyEquivalent } from '@/lib/utils';

interface TopBarProps {
  onAddNode: () => void;
  onOpenPalette: () => void;
  onToggleCosts: () => void;
}

export default function TopBar({ onAddNode, onOpenPalette, onToggleCosts }: TopBarProps) {
  const boards = useStore((s) => s.boards);
  const activeBoardId = useStore((s) => s.activeBoardId);
  const setActiveBoard = useStore((s) => s.setActiveBoard);
  const addBoard = useStore((s) => s.addBoard);
  const renameBoard = useStore((s) => s.renameBoard);
  const deleteBoard = useStore((s) => s.deleteBoard);
  const importState = useStore((s) => s.importState);
  const layoutActiveBoard = useStore((s) => s.layoutActiveBoard);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const snapToGrid = useStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useStore((s) => s.toggleSnapToGrid);
  const alignmentGuides = useStore((s) => s.alignmentGuides);
  const toggleAlignmentGuides = useStore((s) => s.toggleAlignmentGuides);

  const totalMonthly = useStore((s) => {
    const board = s.boards.find((b) => b.id === s.activeBoardId);
    if (!board) return 0;
    return board.nodes.reduce((sum, n) => {
      const m = monthlyEquivalent(n.data.billing?.cost, n.data.billing?.cycle);
      return sum + (m ?? 0);
    }, 0);
  });

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const boardMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getNodes, fitView } = useReactFlow();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) {
        setBoardMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const handleRename = () => {
    if (!activeBoard) return;
    const name = window.prompt('Rename board', activeBoard.name);
    if (name) renameBoard(activeBoard.id, name);
  };

  const handleDelete = () => {
    if (!activeBoard) return;
    if (
      window.confirm(
        `Delete board "${activeBoard.name}"? This removes its nodes and edges.`,
      )
    ) {
      deleteBoard(activeBoard.id);
      setBoardMenuOpen(false);
    }
  };

  const handleNewBoard = () => {
    const name = window.prompt('New board name', 'New Board');
    if (name !== null) {
      addBoard(name || 'New Board');
      setBoardMenuOpen(false);
    }
  };

  const handleTidy = () => {
    layoutActiveBoard();
    // Let the store update land before fitting the view.
    requestAnimationFrame(() =>
      fitView({ padding: 0.25, maxZoom: 1.2, duration: 400 }),
    );
  };

  const handleExportJson = () => {
    const { boards: b, activeBoardId: a } = useStore.getState();
    downloadJson({ boards: b, activeBoardId: a });
    setExportMenuOpen(false);
  };

  const handleExportPng = async () => {
    setExportMenuOpen(false);
    try {
      await exportCanvasPng(
        getNodes(),
        `${activeBoard?.name || 'constellation'}.png`,
        theme === 'dark' ? '#0b0e14' : '#f7f7f8',
      );
    } catch (err) {
      console.error(err);
      window.alert('PNG export failed. See console for details.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const state = await readJsonFile(file);
      importState(state);
    } catch (err) {
      console.error(err);
      window.alert('Import failed: not a valid Constellation JSON file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <header className="z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Left: wordmark + board switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-500 text-sm font-bold text-white">
            ✦
          </span>
          <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:inline dark:text-slate-100">
            Constellation
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="relative" ref={boardMenuRef}>
          <button
            onClick={() => setBoardMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {activeBoard?.name ?? 'No board'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {boardMenuOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="max-h-64 overflow-y-auto">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBoard(b.id);
                      setBoardMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      b.id === activeBoardId
                        ? 'font-semibold text-coral-600 dark:text-coral-400'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">
                      {b.nodes.length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
              <button onClick={handleNewBoard} className={menuItemCls}>
                + New board
              </button>
              <button onClick={handleRename} className={menuItemCls}>
                Rename current
              </button>
              <button
                onClick={handleDelete}
                className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete current
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleCosts}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Stack costs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="font-medium">
            {totalMonthly > 0 ? `${formatMoney(totalMonthly)}/mo` : 'Costs'}
          </span>
        </button>

        <button
          onClick={handleTidy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Auto-arrange the board"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="6" height="6" rx="1" />
            <rect x="15" y="4" width="6" height="6" rx="1" />
            <rect x="9" y="14" width="6" height="6" rx="1" />
            <path d="M9 7h6M12 10v4" />
          </svg>
          <span className="hidden md:inline">Tidy</span>
        </button>

        <button
          onClick={onOpenPalette}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Search (⌘K or /)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[11px] text-slate-500 sm:inline dark:bg-slate-800 dark:text-slate-400">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>

        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Settings"
            aria-label="Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Canvas
              </div>
              <SettingToggle
                label="Alignment guides"
                hint="Snap to nearby nodes' edges and centers while dragging, with guide lines."
                checked={alignmentGuides}
                onToggle={toggleAlignmentGuides}
              />
              <SettingToggle
                label="Snap to grid"
                hint="Lock positions to the background dot grid while dragging."
                checked={snapToGrid}
                onToggle={toggleSnapToGrid}
              />
            </div>
          )}
        </div>

        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Export
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <button onClick={handleExportPng} className={menuItemCls}>
                Export PNG
              </button>
              <button onClick={handleExportJson} className={menuItemCls}>
                Export JSON
              </button>
              <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setExportMenuOpen(false);
                }}
                className={menuItemCls}
              >
                Import JSON
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onAddNode}
          className="flex items-center gap-1.5 rounded-lg bg-coral-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-coral-600"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add node
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
    </header>
  );
}

const menuItemCls =
  'flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';

function SettingToggle({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-coral-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
          {label}
        </span>
        <span className="block text-xs leading-snug text-slate-400">{hint}</span>
      </span>
    </button>
  );
}

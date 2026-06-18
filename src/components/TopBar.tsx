'use client';

import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '@/lib/store';
import { downloadJson, exportCanvasPng, readJsonFile } from '@/lib/io';

interface TopBarProps {
  onAddNode: () => void;
  onOpenPalette: () => void;
}

export default function TopBar({ onAddNode, onOpenPalette }: TopBarProps) {
  const boards = useStore((s) => s.boards);
  const activeBoardId = useStore((s) => s.activeBoardId);
  const setActiveBoard = useStore((s) => s.setActiveBoard);
  const addBoard = useStore((s) => s.addBoard);
  const renameBoard = useStore((s) => s.renameBoard);
  const deleteBoard = useStore((s) => s.deleteBoard);
  const importState = useStore((s) => s.importState);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const boardMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getNodes } = useReactFlow();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) {
        setBoardMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
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

  const handleExportJson = () => {
    const { boards: b, activeBoardId: a } = useStore.getState();
    downloadJson({ boards: b, activeBoardId: a });
    setExportMenuOpen(false);
  };

  const handleExportPng = async () => {
    setExportMenuOpen(false);
    try {
      await exportCanvasPng(getNodes(), `${activeBoard?.name || 'constellation'}.png`);
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
    <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      {/* Left: wordmark + board switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-500 text-sm font-bold text-white">
            ✦
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Constellation
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        <div className="relative" ref={boardMenuRef}>
          <button
            onClick={() => setBoardMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {activeBoard?.name ?? 'No board'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {boardMenuOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <div className="max-h-64 overflow-y-auto">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBoard(b.id);
                      setBoardMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-slate-100 ${
                      b.id === activeBoardId ? 'font-semibold text-coral-600' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">
                      {b.nodes.length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="my-1 h-px bg-slate-100" />
              <button onClick={handleNewBoard} className={menuItemCls}>
                + New board
              </button>
              <button onClick={handleRename} className={menuItemCls}>
                Rename current
              </button>
              <button
                onClick={handleDelete}
                className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"
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
          onClick={onOpenPalette}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
          title="Search (⌘K)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[11px] text-slate-500 sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Export
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <button onClick={handleExportPng} className={menuItemCls}>
                Export PNG
              </button>
              <button onClick={handleExportJson} className={menuItemCls}>
                Export JSON
              </button>
              <div className="my-1 h-px bg-slate-100" />
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
  'flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100';

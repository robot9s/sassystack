'use client';

import { Command } from 'cmdk';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '@/lib/store';
import type { BoardNode } from '@/lib/types';
import { CONTAINER_DEFAULT_HEIGHT, CONTAINER_DEFAULT_WIDTH } from '@/lib/types';
import { displayHostname, ensureUrl } from '@/lib/utils';
import LogoChip from './LogoChip';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAddNode: () => void;
  onNewBoard: () => void;
}

function nodeSearchText(node: BoardNode): string {
  const d = node.data;
  if (node.type === 'note') return `note ${d.text ?? ''}`;
  if (node.type === 'container') return `group container ${d.label ?? ''}`;
  return `node ${d.label ?? ''} ${d.url ?? ''}`;
}

function nodeTitle(node: BoardNode): string {
  const d = node.data;
  if (node.type === 'note') return (d.text ?? '').trim() || 'Empty note';
  return d.label ?? 'Untitled';
}

export default function CommandPalette({
  open,
  onClose,
  onAddNode,
  onNewBoard,
}: CommandPaletteProps) {
  const { setCenter } = useReactFlow();
  const boards = useStore((s) => s.boards);
  const activeBoardId = useStore((s) => s.activeBoardId);
  const setActiveBoard = useStore((s) => s.setActiveBoard);
  const setSelectedNode = useStore((s) => s.setSelectedNode);
  const addContainer = useStore((s) => s.addContainer);
  const addNote = useStore((s) => s.addNote);

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const nodes = activeBoard?.nodes ?? [];

  const focusNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const w =
      node.type === 'container'
        ? node.data.width ?? CONTAINER_DEFAULT_WIDTH
        : 230;
    const h =
      node.type === 'container'
        ? node.data.height ?? CONTAINER_DEFAULT_HEIGHT
        : 50;
    setCenter(node.position.x + w / 2, node.position.y + h / 2, {
      zoom: 1.4,
      duration: 600,
    });
    setSelectedNode(nodeId);
    onClose();
  };

  const openNodeUrl = (url?: string) => {
    if (url) window.open(ensureUrl(url), '_blank', 'noopener,noreferrer');
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/35 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Command label="Command palette" loop>
          <Command.Input autoFocus placeholder="Search nodes, or run a command…" />
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>

            <Command.Group heading="Actions">
              <Command.Item
                value="add node new service"
                onSelect={() => {
                  onAddNode();
                  onClose();
                }}
              >
                <IconPlus />
                <span>Add node</span>
              </Command.Item>
              <Command.Item
                value="add container group"
                onSelect={() => {
                  addContainer();
                  onClose();
                }}
              >
                <IconBox />
                <span>Add container</span>
              </Command.Item>
              <Command.Item
                value="add text note label"
                onSelect={() => {
                  addNote();
                  onClose();
                }}
              >
                <IconText />
                <span>Add text note</span>
              </Command.Item>
              <Command.Item
                value="new board create board"
                onSelect={() => {
                  onNewBoard();
                  onClose();
                }}
              >
                <IconBoard />
                <span>New board</span>
              </Command.Item>
            </Command.Group>

            {nodes.length > 0 && (
              <Command.Group heading="Items (Enter to focus · ⌘Enter to open)">
                {nodes.map((node) => (
                  <Command.Item
                    key={node.id}
                    value={`${nodeSearchText(node)} ${node.id}`}
                    onSelect={() => focusNode(node.id)}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        (e.metaKey || e.ctrlKey) &&
                        node.type !== 'note'
                      ) {
                        e.preventDefault();
                        openNodeUrl(node.data.url);
                      }
                    }}
                  >
                    {node.type === 'note' ? (
                      <span className="text-slate-400"><IconText /></span>
                    ) : node.type === 'container' ? (
                      <LogoChip
                        logoUrl={node.data.logoUrl}
                        color={node.data.color}
                        monogram={node.data.monogram || node.data.label?.[0]}
                        size={20}
                        rounded={5}
                      />
                    ) : (
                      <LogoChip
                        logoUrl={node.data.logoUrl}
                        color={node.data.color}
                        monogram={node.data.monogram}
                        size={20}
                        rounded={5}
                      />
                    )}
                    <span className="flex-1 truncate">{nodeTitle(node)}</span>
                    <span className="text-xs opacity-60">
                      {node.type === 'container'
                        ? 'group'
                        : node.type === 'note'
                          ? 'note'
                          : displayHostname(node.data.url ?? '')}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {boards.length > 1 && (
              <Command.Group heading="Switch board">
                {boards
                  .filter((b) => b.id !== activeBoardId)
                  .map((b) => (
                    <Command.Item
                      key={b.id}
                      value={`board switch ${b.name}`}
                      onSelect={() => {
                        setActiveBoard(b.id);
                        onClose();
                      }}
                    >
                      <IconBoard />
                      <span>{b.name}</span>
                      <span className="ml-auto text-xs opacity-60">
                        {b.nodes.length} items
                      </span>
                    </Command.Item>
                  ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function IconText() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V5h16v2M9 19h6M12 5v14" />
    </svg>
  );
}

function IconBoard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

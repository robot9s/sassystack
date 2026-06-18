'use client';

import { Command } from 'cmdk';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '@/lib/store';
import { displayHostname, ensureUrl } from '@/lib/utils';
import LogoChip from './LogoChip';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onAddNode: () => void;
  onNewBoard: () => void;
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

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const nodes = activeBoard?.nodes ?? [];

  const focusNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const x = node.position.x + 115;
    const y = node.position.y + 25;
    setCenter(x, y, { zoom: 1.4, duration: 600 });
    setSelectedNode(nodeId);
    onClose();
  };

  const openNodeUrl = (url: string) => {
    if (url) window.open(ensureUrl(url), '_blank', 'noopener,noreferrer');
    onClose();
  };

  if (!open) return null;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      label="Command palette"
      // cmdk's built-in filtering provides the fuzzy search
    >
      <Command.Input placeholder="Search nodes, or run a command…" />
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
          <Command.Group heading="Nodes (Enter to focus · ⌘Enter to open)">
            {nodes.map((node) => (
              <Command.Item
                key={node.id}
                value={`node ${node.data.label} ${node.data.url}`}
                onSelect={() => focusNode(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    openNodeUrl(node.data.url);
                  }
                }}
              >
                <LogoChip
                  logoUrl={node.data.logoUrl}
                  color={node.data.color}
                  monogram={node.data.monogram}
                  size={20}
                  rounded={5}
                />
                <span className="flex-1 truncate">{node.data.label}</span>
                <span className="text-xs opacity-60">
                  {displayHostname(node.data.url)}
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
                    {b.nodes.length} nodes
                  </span>
                </Command.Item>
              ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
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

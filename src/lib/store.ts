import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import type {
  AppState,
  Board,
  BoardEdge,
  BoardNode,
  ContainerNodeData,
  NodeData,
  NoteNodeData,
  ServiceNodeData,
} from './types';
import { CONTAINER_DEFAULT_HEIGHT, CONTAINER_DEFAULT_WIDTH } from './types';
import { computeTidyPositions } from './layout';
import { genId } from './utils';

type ThemeMode = 'light' | 'dark';

interface Snapshot {
  boards: Board[];
  activeBoardId: string | null;
}

interface StoreActions {
  // boards
  addBoard: (name?: string) => string;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
  setActiveBoard: (id: string) => void;

  // nodes
  addNode: (data: ServiceNodeData, position?: { x: number; y: number }) => string;
  addContainer: (
    data?: Partial<ContainerNodeData>,
    position?: { x: number; y: number },
  ) => string;
  addNote: (
    data?: Partial<NoteNodeData>,
    position?: { x: number; y: number },
  ) => string;
  duplicateNode: (id: string) => void;
  duplicateNodes: (ids: string[]) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  setNodeParent: (
    nodeId: string,
    parentId: string | null,
    position: { x: number; y: number },
  ) => void;
  fitContainerToChildren: (containerId: string) => void;
  deleteNode: (id: string) => void;

  // clipboard
  copySelection: () => number;
  pasteClipboard: () => boolean;

  // react flow change handlers
  onNodesChange: (changes: NodeChange<BoardNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BoardEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  updateEdge: (id: string, data: Partial<BoardEdge['data']>) => void;
  reverseEdge: (id: string) => void;
  deleteEdge: (id: string) => void;

  // layout
  layoutActiveBoard: () => void;

  // history
  past: Snapshot[];
  future: Snapshot[];
  snapshot: (coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;

  // ui preferences
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;

  // selection (for detail panel)
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  // import / export
  importState: (state: AppState) => void;
  getActiveBoard: () => Board | undefined;
}

export type Store = AppState & StoreActions;

const HISTORY_LIMIT = 100;
const COALESCE_MS = 800;
const CONTAINER_PAD = 16;
const CONTAINER_TITLE_H = 44;

// Fallback sizes when React Flow hasn't measured a node yet.
const NODE_FALLBACK = { service: { w: 230, h: 56 }, note: { w: 140, h: 36 } };

// Copy/paste buffer — module-level so it survives store updates but is
// intentionally not persisted.
let clipboard: { nodes: BoardNode[]; edges: BoardEdge[] } | null = null;

// Coalescing state for history snapshots (e.g. while typing in the panel).
let lastSnapKey: string | null = null;
let lastSnapTime = 0;

function createDefaultBoard(): Board {
  return {
    id: genId('board'),
    name: 'My Stack',
    nodes: [],
    edges: [],
  };
}

/** Deep-clone node data for duplication, falling back when unavailable. */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Apply a mutation to the active board and return new boards array. */
function patchActiveBoard(
  state: AppState,
  patch: (board: Board) => Board,
): Board[] {
  return state.boards.map((b) =>
    b.id === state.activeBoardId ? patch(b) : b,
  );
}

/** Strip legacy `extent: 'parent'` so children can be dragged out of groups. */
function sanitizeBoards(boards: Board[]): Board[] {
  return boards.map((b) => ({
    ...b,
    nodes: b.nodes.map((n) => {
      if (!('extent' in n)) return n;
      const { extent: _e, ...rest } = n;
      void _e;
      return rest;
    }),
  }));
}

function nodeSize(node: BoardNode): { w: number; h: number } {
  if (node.type === 'container') {
    return {
      w: node.data.width ?? CONTAINER_DEFAULT_WIDTH,
      h: node.data.height ?? CONTAINER_DEFAULT_HEIGHT,
    };
  }
  const fb =
    NODE_FALLBACK[(node.type ?? 'service') as keyof typeof NODE_FALLBACK] ??
    NODE_FALLBACK.service;
  return { w: node.measured?.width ?? fb.w, h: node.measured?.height ?? fb.h };
}

/**
 * Given a set of node ids, expand to include children of selected containers,
 * and return cloned nodes (fresh ids) plus edges internal to the set.
 * Children whose parent is NOT in the set are converted to absolute positions.
 */
function cloneSubgraph(
  board: Board,
  ids: string[],
  offset: { x: number; y: number },
): { nodes: BoardNode[]; edges: BoardEdge[] } {
  const idSet = new Set(ids);
  for (const n of board.nodes) {
    if (n.parentId && idSet.has(n.parentId)) idSet.add(n.id);
  }
  const originals = board.nodes.filter((n) => idSet.has(n.id));
  const byId = new Map(board.nodes.map((n) => [n.id, n]));
  const idMap = new Map<string, string>();
  for (const n of originals) idMap.set(n.id, genId(n.type ?? 'node'));

  const nodes: BoardNode[] = originals.map((n) => {
    const clonedParent = n.parentId ? idMap.get(n.parentId) : undefined;
    const retainedParent =
      !clonedParent && n.parentId && byId.has(n.parentId)
        ? n.parentId
        : undefined;

    let position: { x: number; y: number };
    if (clonedParent) {
      // Parent is cloned too — keep relative position, parent gets the offset.
      position = { ...n.position };
    } else if (retainedParent) {
      // Stay inside the same container, offset within it.
      position = { x: n.position.x + offset.x, y: n.position.y + offset.y };
    } else {
      // Top-level (or orphaned): resolve to absolute, then offset.
      const parent = n.parentId ? byId.get(n.parentId) : undefined;
      position = {
        x: (parent?.position.x ?? 0) + n.position.x + offset.x,
        y: (parent?.position.y ?? 0) + n.position.y + offset.y,
      };
    }

    const clone: BoardNode = {
      ...n,
      id: idMap.get(n.id)!,
      position,
      data: structuredCloneSafe(n.data),
      selected: true,
    };
    if (clonedParent) {
      clone.parentId = clonedParent;
    } else if (retainedParent) {
      clone.parentId = retainedParent;
    } else {
      delete clone.parentId;
    }
    delete clone.extent;
    return clone;
  });

  const edges: BoardEdge[] = board.edges
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e) => ({
      ...e,
      id: genId('edge'),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
      selected: false,
      data: e.data ? structuredCloneSafe(e.data) : e.data,
    }));

  return { nodes, edges };
}

/** Insert cloned nodes into a board, deselecting everything that was there. */
function insertClones(
  board: Board,
  clones: { nodes: BoardNode[]; edges: BoardEdge[] },
): Board {
  return {
    ...board,
    nodes: [
      ...board.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      ...clones.nodes,
    ],
    edges: [
      ...board.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      ...clones.edges,
    ],
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      boards: [],
      activeBoardId: null,
      selectedNodeId: null,
      past: [],
      future: [],
      theme: 'light' as ThemeMode,
      snapToGrid: false,

      getActiveBoard: () => {
        const { boards, activeBoardId } = get();
        return boards.find((b) => b.id === activeBoardId);
      },

      // ---- history ----------------------------------------------------

      snapshot: (coalesceKey) => {
        const now = Date.now();
        if (
          coalesceKey &&
          coalesceKey === lastSnapKey &&
          now - lastSnapTime < COALESCE_MS
        ) {
          lastSnapTime = now;
          return;
        }
        lastSnapKey = coalesceKey ?? null;
        lastSnapTime = now;
        set((s) => ({
          past: [
            ...s.past.slice(-(HISTORY_LIMIT - 1)),
            { boards: s.boards, activeBoardId: s.activeBoardId },
          ],
          future: [],
        }));
      },

      undo: () =>
        set((s) => {
          const past = [...s.past];
          const prev = past.pop();
          if (!prev) return {};
          lastSnapKey = null;
          return {
            boards: prev.boards,
            activeBoardId: prev.activeBoardId,
            past,
            future: [
              ...s.future,
              { boards: s.boards, activeBoardId: s.activeBoardId },
            ],
            selectedNodeId: null,
          };
        }),

      redo: () =>
        set((s) => {
          const future = [...s.future];
          const next = future.pop();
          if (!next) return {};
          lastSnapKey = null;
          return {
            boards: next.boards,
            activeBoardId: next.activeBoardId,
            future,
            past: [
              ...s.past,
              { boards: s.boards, activeBoardId: s.activeBoardId },
            ],
            selectedNodeId: null,
          };
        }),

      // ---- ui preferences ----------------------------------------------

      setTheme: (theme) => set({ theme }),
      toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

      // ---- boards -------------------------------------------------------

      addBoard: (name) => {
        get().snapshot();
        const board: Board = {
          id: genId('board'),
          name: name?.trim() || 'New Board',
          nodes: [],
          edges: [],
        };
        set((s) => ({
          boards: [...s.boards, board],
          activeBoardId: board.id,
          selectedNodeId: null,
        }));
        return board.id;
      },

      renameBoard: (id, name) => {
        get().snapshot(`board:${id}`);
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === id ? { ...b, name: name.trim() || b.name } : b,
          ),
        }));
      },

      deleteBoard: (id) => {
        get().snapshot();
        set((s) => {
          const remaining = s.boards.filter((b) => b.id !== id);
          const boards = remaining.length ? remaining : [createDefaultBoard()];
          const activeBoardId =
            s.activeBoardId === id ? boards[0].id : s.activeBoardId;
          return { boards, activeBoardId, selectedNodeId: null };
        });
      },

      setActiveBoard: (id) =>
        set({ activeBoardId: id, selectedNodeId: null }),

      // ---- nodes ----------------------------------------------------------

      addNode: (data, position) => {
        get().snapshot();
        const id = genId('node');
        const node: BoardNode = {
          id,
          type: 'service',
          position: position ?? {
            x: 120 + Math.random() * 240,
            y: 120 + Math.random() * 160,
          },
          data: data as NodeData,
        };
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: [...b.nodes, node],
          })),
          selectedNodeId: id,
        }));
        return id;
      },

      addContainer: (data, position) => {
        get().snapshot();
        const id = genId('container');
        const node: BoardNode = {
          id,
          type: 'container',
          position: position ?? {
            x: 100 + Math.random() * 160,
            y: 100 + Math.random() * 120,
          },
          zIndex: 0,
          data: {
            label: data?.label ?? 'New Group',
            color: data?.color ?? '#94a3b8',
            url: data?.url,
            logoUrl: data?.logoUrl ?? null,
            monogram: data?.monogram,
            width: data?.width ?? CONTAINER_DEFAULT_WIDTH,
            height: data?.height ?? CONTAINER_DEFAULT_HEIGHT,
          },
        };
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            // keep containers first so they remain valid parents on render
            nodes: [node, ...b.nodes],
          })),
          selectedNodeId: id,
        }));
        return id;
      },

      addNote: (data, position) => {
        get().snapshot();
        const id = genId('note');
        const node: BoardNode = {
          id,
          type: 'note',
          position: position ?? {
            x: 140 + Math.random() * 200,
            y: 140 + Math.random() * 140,
          },
          zIndex: 5,
          data: {
            text: data?.text ?? '',
            color: data?.color,
            fontSize: data?.fontSize ?? 16,
          },
        };
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: [...b.nodes, node],
          })),
          selectedNodeId: id,
        }));
        return id;
      },

      duplicateNode: (id) => get().duplicateNodes([id]),

      duplicateNodes: (ids) => {
        if (!ids.length) return;
        const board = get().getActiveBoard();
        if (!board) return;
        get().snapshot();
        const clones = cloneSubgraph(board, ids, { x: 28, y: 28 });
        if (!clones.nodes.length) return;
        const parents = new Set(
          clones.nodes.filter((n) => n.parentId).map((n) => n.parentId!),
        );
        set((s) => ({
          boards: patchActiveBoard(s, (b) => insertClones(b, clones)),
          selectedNodeId: clones.nodes.length === 1 ? clones.nodes[0].id : null,
        }));
        // A duplicated child may overflow its container — grow to fit.
        for (const pid of parents) get().fitContainerToChildren(pid);
      },

      copySelection: () => {
        const board = get().getActiveBoard();
        if (!board) return 0;
        const selected = board.nodes.filter((n) => n.selected).map((n) => n.id);
        if (!selected.length) return 0;
        // Clone with original ids preserved inside the buffer; fresh ids are
        // minted at paste time so repeated pastes don't collide.
        const idSet = new Set(selected);
        for (const n of board.nodes) {
          if (n.parentId && idSet.has(n.parentId)) idSet.add(n.id);
        }
        const byId = new Map(board.nodes.map((n) => [n.id, n]));
        clipboard = {
          nodes: board.nodes
            .filter((n) => idSet.has(n.id))
            .map((n) => {
              const keepParent = n.parentId && idSet.has(n.parentId);
              const parent = n.parentId ? byId.get(n.parentId) : undefined;
              return structuredCloneSafe({
                ...n,
                position: keepParent
                  ? n.position
                  : {
                      x: (parent?.position.x ?? 0) + n.position.x,
                      y: (parent?.position.y ?? 0) + n.position.y,
                    },
                parentId: keepParent ? n.parentId : undefined,
              });
            }),
          edges: board.edges
            .filter((e) => idSet.has(e.source) && idSet.has(e.target))
            .map((e) => structuredCloneSafe(e)),
        };
        return idSet.size;
      },

      pasteClipboard: () => {
        if (!clipboard || !clipboard.nodes.length) return false;
        const board = get().getActiveBoard();
        if (!board) return false;
        get().snapshot();
        const fake: Board = {
          ...board,
          nodes: clipboard.nodes,
          edges: clipboard.edges,
        };
        const clones = cloneSubgraph(
          fake,
          clipboard.nodes.map((n) => n.id),
          { x: 32, y: 32 },
        );
        set((s) => ({
          boards: patchActiveBoard(s, (b) => insertClones(b, clones)),
          selectedNodeId: clones.nodes.length === 1 ? clones.nodes[0].id : null,
        }));
        return true;
      },

      updateNode: (id, data) => {
        get().snapshot(`node:${id}`);
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: b.nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
            ),
          })),
        }));
      },

      setNodeParent: (nodeId, parentId, position) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: b.nodes.map((n) => {
              if (n.id !== nodeId) return n;
              if (parentId) {
                const { extent: _e, ...rest } = n;
                void _e;
                return { ...rest, parentId, position };
              }
              // detach: drop parent-related fields
              const { parentId: _p, extent: _e2, ...rest } = n;
              void _p;
              void _e2;
              return { ...rest, position };
            }),
          })),
        })),

      fitContainerToChildren: (containerId) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => {
            const container = b.nodes.find(
              (n) => n.id === containerId && n.type === 'container',
            );
            if (!container) return b;
            const children = b.nodes.filter((n) => n.parentId === containerId);
            if (!children.length) return b;

            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (const c of children) {
              const { w, h } = nodeSize(c);
              minX = Math.min(minX, c.position.x);
              minY = Math.min(minY, c.position.y);
              maxX = Math.max(maxX, c.position.x + w);
              maxY = Math.max(maxY, c.position.y + h);
            }

            // If a child sits above/left of the padded area, grow that way by
            // shifting the container origin and compensating child positions.
            const shiftX = Math.min(0, minX - CONTAINER_PAD);
            const shiftY = Math.min(0, minY - CONTAINER_TITLE_H);
            const curW = container.data.width ?? CONTAINER_DEFAULT_WIDTH;
            const curH = container.data.height ?? CONTAINER_DEFAULT_HEIGHT;
            const width = Math.max(curW - shiftX, maxX - shiftX + CONTAINER_PAD);
            const height = Math.max(curH - shiftY, maxY - shiftY + CONTAINER_PAD);

            const unchanged =
              shiftX === 0 && shiftY === 0 && width === curW && height === curH;
            if (unchanged) return b;

            return {
              ...b,
              nodes: b.nodes.map((n) => {
                if (n.id === containerId) {
                  return {
                    ...n,
                    position: {
                      x: n.position.x + shiftX,
                      y: n.position.y + shiftY,
                    },
                    data: { ...n.data, width, height },
                  };
                }
                if (n.parentId === containerId && (shiftX !== 0 || shiftY !== 0)) {
                  return {
                    ...n,
                    position: {
                      x: n.position.x - shiftX,
                      y: n.position.y - shiftY,
                    },
                  };
                }
                return n;
              }),
            };
          }),
        })),

      deleteNode: (id) => {
        get().snapshot();
        set((s) => ({
          boards: patchActiveBoard(s, (b) => {
            const container = b.nodes.find(
              (n) => n.id === id && n.type === 'container',
            );
            return {
              ...b,
              nodes: b.nodes
                .filter((n) => n.id !== id)
                .map((n) => {
                  // detach children of a deleted container, restoring absolute pos
                  if (container && n.parentId === id) {
                    const { parentId: _p, extent: _e, ...rest } = n;
                    void _p;
                    void _e;
                    return {
                      ...rest,
                      position: {
                        x: container.position.x + n.position.x,
                        y: container.position.y + n.position.y,
                      },
                    };
                  }
                  return n;
                }),
              edges: b.edges.filter((e) => e.source !== id && e.target !== id),
            };
          }),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        }));
      },

      // ---- react flow change handlers ------------------------------------

      onNodesChange: (changes) => {
        const removedIds = new Set(
          changes.filter((c) => c.type === 'remove').map((c) => c.id),
        );
        if (removedIds.size) get().snapshot();
        set((s) => ({
          boards: patchActiveBoard(s, (b) => {
            const removedContainers = new Map(
              b.nodes
                .filter((n) => removedIds.has(n.id) && n.type === 'container')
                .map((n) => [n.id, n.position]),
            );
            let nodes = applyNodeChanges(changes, b.nodes);
            if (removedContainers.size) {
              nodes = nodes.map((n) => {
                if (n.parentId && removedContainers.has(n.parentId)) {
                  const cpos = removedContainers.get(n.parentId)!;
                  const { parentId: _p, extent: _e, ...rest } = n;
                  void _p;
                  void _e;
                  return {
                    ...rest,
                    position: {
                      x: cpos.x + n.position.x,
                      y: cpos.y + n.position.y,
                    },
                  };
                }
                return n;
              });
            }
            return { ...b, nodes };
          }),
          selectedNodeId:
            s.selectedNodeId && removedIds.has(s.selectedNodeId)
              ? null
              : s.selectedNodeId,
        }));
      },

      onEdgesChange: (changes) => {
        if (changes.some((c) => c.type === 'remove')) get().snapshot();
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: applyEdgeChanges(changes, b.edges),
          })),
        }));
      },

      onConnect: (connection) => {
        get().snapshot();
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: addEdge(
              {
                ...connection,
                id: genId('edge'),
                type: 'service',
                data: { style: 'standard' as const, animated: false },
              },
              b.edges,
            ),
          })),
        }));
      },

      onReconnect: (oldEdge, newConnection) => {
        get().snapshot();
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: reconnectEdge(oldEdge, newConnection, b.edges),
          })),
        }));
      },

      updateEdge: (id, data) => {
        get().snapshot(`edge:${id}`);
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: b.edges.map((e) =>
              e.id === id ? { ...e, data: { ...e.data, ...data } } : e,
            ),
          })),
        }));
      },

      reverseEdge: (id) => {
        get().snapshot();
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: b.edges.map((e) =>
              e.id === id
                ? {
                    ...e,
                    source: e.target,
                    target: e.source,
                    sourceHandle: e.targetHandle ?? null,
                    targetHandle: e.sourceHandle ?? null,
                  }
                : e,
            ),
          })),
        }));
      },

      deleteEdge: (id) => {
        get().snapshot();
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: b.edges.filter((e) => e.id !== id),
          })),
        }));
      },

      // ---- layout ---------------------------------------------------------

      layoutActiveBoard: () => {
        const board = get().getActiveBoard();
        if (!board || !board.nodes.length) return;
        get().snapshot();
        const positions = computeTidyPositions(board);
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: b.nodes.map((n) => {
              const pos = positions.get(n.id);
              return pos ? { ...n, position: pos } : n;
            }),
          })),
        }));
      },

      setSelectedNode: (id) => set({ selectedNodeId: id }),

      importState: (state) => {
        get().snapshot();
        set(() => {
          const boards =
            state.boards && state.boards.length
              ? sanitizeBoards(state.boards)
              : [createDefaultBoard()];
          const activeBoardId =
            state.activeBoardId &&
            boards.some((b) => b.id === state.activeBoardId)
              ? state.activeBoardId
              : boards[0].id;
          return { boards, activeBoardId, selectedNodeId: null };
        });
      },
    }),
    {
      name: 'constellation:app-state:v1',
      partialize: (s) => ({
        boards: s.boards,
        activeBoardId: s.activeBoardId,
        theme: s.theme,
        snapToGrid: s.snapToGrid,
      }),
      onRehydrateStorage: () => (state) => {
        // Ensure there is always at least one board after rehydration.
        if (state && (!state.boards || state.boards.length === 0)) {
          const board = createDefaultBoard();
          state.boards = [board];
          state.activeBoardId = board.id;
        } else if (state) {
          state.boards = sanitizeBoards(state.boards);
          if (!state.activeBoardId) state.activeBoardId = state.boards[0].id;
        }
      },
    },
  ),
);

/** Seed a default board on first load (client-side). */
export function ensureSeedBoard() {
  const { boards, addBoard } = useStore.getState();
  if (!boards.length) {
    addBoard('My Stack');
    // The seed isn't a user action — don't let undo return to zero boards.
    useStore.setState({ past: [], future: [] });
  }
}

/**
 * Returns true once the persisted store has finished hydrating from
 * localStorage. Uses useSyncExternalStore so it stays SSR-safe (server
 * snapshot is always false) without calling setState inside an effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
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
import { genId } from './utils';

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
  duplicateNode: (id: string) => string | null;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  setNodeParent: (
    nodeId: string,
    parentId: string | null,
    position: { x: number; y: number },
  ) => void;
  deleteNode: (id: string) => void;

  // react flow change handlers
  onNodesChange: (changes: NodeChange<BoardNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BoardEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  updateEdge: (id: string, data: Partial<BoardEdge['data']>) => void;
  reverseEdge: (id: string) => void;
  deleteEdge: (id: string) => void;

  // selection (for detail panel)
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  // import / export
  importState: (state: AppState) => void;
  getActiveBoard: () => Board | undefined;
}

export type Store = AppState & StoreActions;

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

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      boards: [],
      activeBoardId: null,
      selectedNodeId: null,

      getActiveBoard: () => {
        const { boards, activeBoardId } = get();
        return boards.find((b) => b.id === activeBoardId);
      },

      addBoard: (name) => {
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

      renameBoard: (id, name) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === id ? { ...b, name: name.trim() || b.name } : b,
          ),
        })),

      deleteBoard: (id) =>
        set((s) => {
          const remaining = s.boards.filter((b) => b.id !== id);
          const boards = remaining.length ? remaining : [createDefaultBoard()];
          const activeBoardId =
            s.activeBoardId === id ? boards[0].id : s.activeBoardId;
          return { boards, activeBoardId, selectedNodeId: null };
        }),

      setActiveBoard: (id) =>
        set({ activeBoardId: id, selectedNodeId: null }),

      addNode: (data, position) => {
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
        const id = genId('container');
        const node: BoardNode = {
          id,
          type: 'container',
          position: position ?? {
            x: 100 + Math.random() * 160,
            y: 100 + Math.random() * 120,
          },
          // Containers render behind regular nodes.
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
            color: data?.color ?? '#1c1917',
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

      duplicateNode: (id) => {
        const board = get().boards.find((b) => b.id === get().activeBoardId);
        const original = board?.nodes.find((n) => n.id === id);
        if (!original) return null;
        const newId = genId(original.type ?? 'node');
        const copy: BoardNode = {
          ...original,
          id: newId,
          // copy content only — never the connections
          position: {
            x: original.position.x + 28,
            y: original.position.y + 28,
          },
          data: structuredCloneSafe(original.data),
          selected: false,
        };
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            // containers stay first; everything else appends
            nodes:
              original.type === 'container'
                ? [copy, ...b.nodes]
                : [...b.nodes, copy],
          })),
          selectedNodeId: newId,
        }));
        return newId;
      },

      updateNode: (id, data) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: b.nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
            ),
          })),
        })),

      setNodeParent: (nodeId, parentId, position) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: b.nodes.map((n) => {
              if (n.id !== nodeId) return n;
              if (parentId) {
                return { ...n, parentId, extent: 'parent' as const, position };
              }
              // detach: drop parent-related fields
              const { parentId: _p, extent: _e, ...rest } = n;
              void _p;
              void _e;
              return { ...rest, position };
            }),
          })),
        })),

      deleteNode: (id) =>
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
        })),

      onNodesChange: (changes) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: applyNodeChanges(changes, b.nodes),
          })),
        })),

      onEdgesChange: (changes) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: applyEdgeChanges(changes, b.edges),
          })),
        })),

      onConnect: (connection) =>
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
        })),

      updateEdge: (id, data) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: b.edges.map((e) =>
              e.id === id ? { ...e, data: { ...e.data, ...data } } : e,
            ),
          })),
        })),

      reverseEdge: (id) =>
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
        })),

      deleteEdge: (id) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            edges: b.edges.filter((e) => e.id !== id),
          })),
        })),

      setSelectedNode: (id) => set({ selectedNodeId: id }),

      importState: (state) =>
        set(() => {
          const boards =
            state.boards && state.boards.length
              ? state.boards
              : [createDefaultBoard()];
          const activeBoardId =
            state.activeBoardId &&
            boards.some((b) => b.id === state.activeBoardId)
              ? state.activeBoardId
              : boards[0].id;
          return { boards, activeBoardId, selectedNodeId: null };
        }),
    }),
    {
      name: 'constellation:app-state:v1',
      partialize: (s) => ({
        boards: s.boards,
        activeBoardId: s.activeBoardId,
      }),
      onRehydrateStorage: () => (state) => {
        // Ensure there is always at least one board after rehydration.
        if (state && (!state.boards || state.boards.length === 0)) {
          const board = createDefaultBoard();
          state.boards = [board];
          state.activeBoardId = board.id;
        } else if (state && !state.activeBoardId) {
          state.activeBoardId = state.boards[0].id;
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

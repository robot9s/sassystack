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
  ServiceNode,
  ServiceNodeData,
} from './types';
import { genId } from './utils';

interface StoreActions {
  // boards
  addBoard: (name?: string) => string;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
  setActiveBoard: (id: string) => void;

  // nodes
  addNode: (data: ServiceNodeData, position?: { x: number; y: number }) => string;
  updateNode: (id: string, data: Partial<ServiceNodeData>) => void;
  deleteNode: (id: string) => void;

  // react flow change handlers
  onNodesChange: (changes: NodeChange<ServiceNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BoardEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  updateEdge: (id: string, data: Partial<BoardEdge['data']>) => void;
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
        const node: ServiceNode = {
          id,
          type: 'service',
          position: position ?? {
            x: 120 + Math.random() * 240,
            y: 120 + Math.random() * 160,
          },
          data,
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

      updateNode: (id, data) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: b.nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
            ),
          })),
        })),

      deleteNode: (id) =>
        set((s) => ({
          boards: patchActiveBoard(s, (b) => ({
            ...b,
            nodes: b.nodes.filter((n) => n.id !== id),
            edges: b.edges.filter((e) => e.source !== id && e.target !== id),
          })),
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
                data: { kind: 'link' as const },
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

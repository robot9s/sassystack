import dagre from '@dagrejs/dagre';
import type { Board, BoardNode } from './types';
import { CONTAINER_DEFAULT_HEIGHT, CONTAINER_DEFAULT_WIDTH } from './types';

const FALLBACK_SIZES: Record<string, { w: number; h: number }> = {
  service: { w: 230, h: 56 },
  note: { w: 140, h: 36 },
};

function sizeOf(node: BoardNode): { w: number; h: number } {
  if (node.type === 'container') {
    return {
      w: node.data.width ?? CONTAINER_DEFAULT_WIDTH,
      h: node.data.height ?? CONTAINER_DEFAULT_HEIGHT,
    };
  }
  const fallback = FALLBACK_SIZES[node.type ?? 'service'] ?? FALLBACK_SIZES.service;
  return {
    w: node.measured?.width ?? fallback.w,
    h: node.measured?.height ?? fallback.h,
  };
}

/**
 * Compute tidy left-to-right positions for the board's top-level nodes using
 * dagre. Children of containers keep their relative positions and move with
 * their parent; edges between children are mapped to their containers so
 * grouped services still influence the layout.
 */
export function computeTidyPositions(
  board: Board,
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 96, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const parentOf = new Map(board.nodes.map((n) => [n.id, n.parentId]));
  const topLevel = board.nodes.filter((n) => !n.parentId);

  for (const node of topLevel) {
    const { w, h } = sizeOf(node);
    g.setNode(node.id, { width: w, height: h });
  }

  const topAncestor = (id: string): string => parentOf.get(id) ?? id;

  const seen = new Set<string>();
  for (const edge of board.edges) {
    const source = topAncestor(edge.source);
    const target = topAncestor(edge.target);
    if (source === target) continue;
    const key = `${source}->${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (g.hasNode(source) && g.hasNode(target)) g.setEdge(source, target);
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of topLevel) {
    const laid = g.node(node.id);
    if (!laid) continue;
    const { w, h } = sizeOf(node);
    // dagre returns center coordinates; React Flow wants top-left.
    positions.set(node.id, {
      x: Math.round(laid.x - w / 2),
      y: Math.round(laid.y - h / 2),
    });
  }
  return positions;
}

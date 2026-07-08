import type { NodePositionChange } from '@xyflow/react';
import type { BoardNode } from './types';
import { CONTAINER_DEFAULT_HEIGHT, CONTAINER_DEFAULT_WIDTH } from './types';

/** How close (in flow units) an edge must be before it snaps. */
const SNAP_DISTANCE = 6;

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
  const fb = FALLBACK_SIZES[node.type ?? 'service'] ?? FALLBACK_SIZES.service;
  return { w: node.measured?.width ?? fb.w, h: node.measured?.height ?? fb.h };
}

export interface HelperLines {
  /** y coordinate of a horizontal guide line (same space as the dragged node). */
  horizontal?: number;
  /** x coordinate of a vertical guide line. */
  vertical?: number;
  /** Adjusted position for the dragged node when a snap triggered. */
  snapPosition: { x?: number; y?: number };
}

/**
 * Figma-style alignment snapping: while a single node drags, compare its
 * edges and centers against every sibling (same parent / both top-level).
 * When an edge or center comes within SNAP_DISTANCE, snap to it and report
 * the guide-line coordinate so the canvas can draw it.
 */
export function getHelperLines(
  change: NodePositionChange,
  nodes: BoardNode[],
): HelperLines {
  const result: HelperLines = { snapPosition: {} };
  const nodeA = nodes.find((n) => n.id === change.id);
  if (!nodeA || !change.position) return result;

  const { w: wA, h: hA } = sizeOf(nodeA);
  const left = change.position.x;
  const top = change.position.y;

  let bestV = SNAP_DISTANCE;
  let bestH = SNAP_DISTANCE;

  for (const nodeB of nodes) {
    if (nodeB.id === nodeA.id) continue;
    // Only compare nodes sharing a coordinate space.
    if ((nodeB.parentId ?? null) !== (nodeA.parentId ?? null)) continue;

    const { w: wB, h: hB } = sizeOf(nodeB);
    const bLeft = nodeB.position.x;
    const bRight = bLeft + wB;
    const bTop = nodeB.position.y;
    const bBottom = bTop + hB;
    const bCenterX = bLeft + wB / 2;
    const bCenterY = bTop + hB / 2;

    // [snapped left-position for A, guide-line coordinate]
    const verticalCandidates: [number, number][] = [
      [bLeft, bLeft], // A.left = B.left
      [bRight, bRight], // A.left = B.right (edge-to-edge stack)
      [bLeft - wA, bLeft], // A.right = B.left
      [bRight - wA, bRight], // A.right = B.right
      [bCenterX - wA / 2, bCenterX], // centers aligned
    ];
    for (const [snapX, guideX] of verticalCandidates) {
      const d = Math.abs(left - snapX);
      if (d < bestV) {
        bestV = d;
        result.snapPosition.x = snapX;
        result.vertical = guideX;
      }
    }

    const horizontalCandidates: [number, number][] = [
      [bTop, bTop], // A.top = B.top
      [bBottom, bBottom], // A.top = B.bottom
      [bTop - hA, bTop], // A.bottom = B.top
      [bBottom - hA, bBottom], // A.bottom = B.bottom
      [bCenterY - hA / 2, bCenterY], // centers aligned
    ];
    for (const [snapY, guideY] of horizontalCandidates) {
      const d = Math.abs(top - snapY);
      if (d < bestH) {
        bestH = d;
        result.snapPosition.y = snapY;
        result.horizontal = guideY;
      }
    }
  }

  return result;
}

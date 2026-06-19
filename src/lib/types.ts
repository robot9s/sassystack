import type { Node, Edge } from '@xyflow/react';

export type BillingCycle = 'monthly' | 'annual' | 'usage' | 'none';

export interface BillingInfo {
  plan?: string;
  cost?: number; // monthly $, typed in manually
  cycle?: BillingCycle;
  nextCharge?: string; // ISO date string
}

/** Service node — a single tool/service in the stack. */
export interface ServiceNodeData {
  label: string; // "Stripe"
  url: string; // "https://dashboard.stripe.com"
  logoUrl?: string | null; // resolved by /api/brand
  color?: string; // hex, resolved or derived
  monogram?: string; // fallback letters
  category?: string; // optional tag: "infra" | "payments" | "domains" | ...
  notes?: string;
  billing?: BillingInfo;
}

/** Container node — a visual grouping box for related services. */
export interface ContainerNodeData {
  label: string;
  url?: string;
  logoUrl?: string | null;
  color?: string;
  monogram?: string;
  width?: number;
  height?: number;
}

/** Freeform text note — a standalone canvas label (Excalidraw-style). */
export interface NoteNodeData {
  text: string;
  color?: string; // text color
  fontSize?: number;
}

/**
 * Permissive superset used as the React Flow node data type. The `type` field
 * on the node (`service` | `container` | `note`) discriminates which fields are
 * meaningful; components read the relevant subset.
 */
export interface NodeData {
  // service
  label?: string;
  url?: string;
  logoUrl?: string | null;
  color?: string;
  monogram?: string;
  category?: string;
  notes?: string;
  billing?: BillingInfo;
  // container
  width?: number;
  height?: number;
  // note
  text?: string;
  fontSize?: number;
  [key: string]: unknown;
}

export type NodeKind = 'service' | 'container' | 'note';

export type EdgeKind = 'link' | 'data' | 'auth'; // legacy

export type EdgeStyle =
  | 'standard'
  | 'dashed'
  | 'bidirectional'
  | 'dependency'
  | 'animated';

export interface BoardEdgeData {
  label?: string;
  style?: EdgeStyle;
  animated?: boolean;
  kind?: EdgeKind; // legacy, mapped to a style at render time
  [key: string]: unknown;
}

export type BoardNode = Node<NodeData>;
export type BoardEdge = Edge<BoardEdgeData>;

// Back-compat alias used by service-specific components.
export type ServiceNode = BoardNode;

export interface Board {
  id: string;
  name: string;
  nodes: BoardNode[];
  edges: BoardEdge[];
}

export interface AppState {
  boards: Board[];
  activeBoardId: string | null;
}

/** Shape returned by GET /api/brand */
export interface BrandResult {
  logoUrl: string | null;
  color: string; // hex
  source: string;
  monogram: string;
}

export const CATEGORIES = [
  'infra',
  'payments',
  'domains',
  'analytics',
  'auth',
  'database',
  'design',
  'comms',
  'other',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  infra: '#6366f1',
  payments: '#16a34a',
  domains: '#0ea5e9',
  analytics: '#f59e0b',
  auth: '#a855f7',
  database: '#14b8a6',
  design: '#ec4899',
  comms: '#ef4444',
  other: '#64748b',
};

/** Quick label presets offered in the edge editor. */
export const EDGE_LABEL_PRESETS = [
  'HTTP',
  'HTTPS',
  'SSH',
  'WebSocket',
  'Kafka',
  'Reads',
  'Writes',
  'Deploys',
  'Triggers',
] as const;

export const EDGE_STYLES: { value: EdgeStyle; label: string; hint: string }[] = [
  { value: 'standard', label: 'Standard', hint: 'Solid directional line' },
  { value: 'dashed', label: 'Dashed', hint: 'Dashed directional line' },
  { value: 'bidirectional', label: 'Bidirectional', hint: 'Arrows on both ends' },
  { value: 'dependency', label: 'Dependency', hint: 'Subtle dotted line' },
  { value: 'animated', label: 'Data flow', hint: 'Animated movement' },
];

/** Default container dimensions. */
export const CONTAINER_DEFAULT_WIDTH = 340;
export const CONTAINER_DEFAULT_HEIGHT = 230;

/** Map legacy edge kinds onto the new style system. */
export function styleFromKind(kind?: EdgeKind): EdgeStyle {
  switch (kind) {
    case 'data':
      return 'dashed';
    case 'auth':
      return 'dependency';
    case 'link':
    default:
      return 'standard';
  }
}

/** Resolve the effective style of an edge (new field, else legacy kind). */
export function resolveEdgeStyle(data?: BoardEdgeData): EdgeStyle {
  if (data?.style) return data.style;
  return styleFromKind(data?.kind);
}

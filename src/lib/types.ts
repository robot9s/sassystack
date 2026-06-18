import type { Node, Edge } from '@xyflow/react';

export type BillingCycle = 'monthly' | 'annual' | 'usage' | 'none';

export interface BillingInfo {
  plan?: string;
  cost?: number; // monthly $, typed in manually
  cycle?: BillingCycle;
  nextCharge?: string; // ISO date string
}

export interface ServiceNodeData {
  label: string; // "Stripe"
  url: string; // "https://dashboard.stripe.com"
  logoUrl?: string | null; // resolved by /api/brand
  color?: string; // hex, resolved or derived
  monogram?: string; // fallback letters
  category?: string; // optional tag: "infra" | "payments" | "domains" | ...
  notes?: string;
  billing?: BillingInfo;
  [key: string]: unknown;
}

export type EdgeKind = 'link' | 'data' | 'auth';

export interface BoardEdgeData {
  label?: string;
  kind?: EdgeKind;
  [key: string]: unknown;
}

export type ServiceNode = Node<ServiceNodeData>;
export type BoardEdge = Edge<BoardEdgeData>;

export interface Board {
  id: string;
  name: string;
  nodes: ServiceNode[];
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

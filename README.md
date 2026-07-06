# Constellation

A visual home dashboard for your project's stack. Each external service or tool
(GitHub, Railway, Supabase, Stripe, your domain, analytics, …) is a **node** showing
its real logo, and nodes are connected by **edges** to show how the stack fits
together — a node-graph bookmark page for your whole stack.

This is a **local-first app for personal use**. Everything lives in your browser's
`localStorage`. No login, no database, no payments, no third-party integrations.

## Features

- **Visual canvas** of draggable service nodes with pan/zoom, a dotted background,
  minimap, and controls (React Flow).
- **Brand-logo grabber** — paste a URL and the node gets the real logo and a brand
  color automatically, with a clean monogram fallback if no logo is found.
- **Connections** between nodes with editable labels and three kinds (`link`, `data`,
  `auth`). Double-click an edge to edit it.
- **Detail panel** to edit a node's name, URL, category, notes, and optional **manual
  billing** fields (plan / cost / cycle / next charge — just metadata you type in).
- **⌘K command palette** (also `/`) to fuzzy-search nodes and jump to them, plus quick actions.
- **Stack cost dashboard** — billing on nodes *and* containers rolls up into a Costs
  panel: monthly/annual totals, upcoming renewals, and a per-item breakdown.
- **Containers** that group related nodes, auto-grow to fit their members, and carry
  their own logo, color, link, and billing.
- **Text notes**, a **right-click context menu**, and **undo/redo** (⌘Z / ⇧⌘Z).
- **Multi-select** (shift-drag), **copy/paste** (⌘C/⌘V), and **duplicate** (⌘D).
- **Tidy** auto-layout (dagre), snap-to-grid toggle, and edge reconnection by dragging
  an endpoint.
- **Dark mode** toggle.
- **Multiple boards** (one per project) with a switcher.
- **Local persistence** — survives refreshes.
- **Export** to PNG (with a watermark) and **export / import** the full state as JSON.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How to use

- **Add a service**: click **Add node** (or double-click empty canvas), paste a URL,
  press Enter. Keep pressing Enter to add several quickly; Esc closes.
- **Connect services**: drag from a node's right handle to another node's left handle.
- **Edit an edge**: double-click it to set a label and kind.
- **Edit a node**: click it (or the pencil icon) to open the detail panel.
- **Open a service**: double-click its card.
- **Search**: press **⌘K** / **Ctrl-K**. Enter focuses a node; ⌘/Ctrl+Enter opens its URL.
- **Boards**: use the switcher next to the wordmark to create / rename / delete / switch.
- **Backup**: Export → JSON. Restore with Export → Import JSON.

## The logo grabber

`GET /api/brand?url=<site>` runs server-side (no CORS issues) and **always returns
something usable**:

```ts
{ logoUrl: string | null, color: string /* hex */, source: string, monogram: string }
```

Resolution cascade (stops at the first that works):

1. **Brandfetch** — if `BRANDFETCH_API_KEY` is set.
2. **Logo.dev** — if `LOGODEV_TOKEN` is set.
3. **Favicon services** (no key needed): Google S2 favicons, then DuckDuckGo icons.
4. **Color**: dominant color extracted from the chosen icon with `node-vibrant`.
5. **Fallback**: deterministic color derived from the domain + a 1–2 letter monogram,
   so the UI never shows a broken image.

Results are cached per-domain in memory (server) and in `localStorage` (client).

### Optional environment variables

Create `.env.local` to enable higher-quality logos (the favicon path needs no keys):

```bash
BRANDFETCH_API_KEY=...   # optional
LOGODEV_TOKEN=...        # optional
```

## Tech stack

Next.js (App Router) + TypeScript · Tailwind CSS · React Flow (`@xyflow/react`) ·
Zustand (persisted to `localStorage`) · cmdk · html-to-image · node-vibrant.

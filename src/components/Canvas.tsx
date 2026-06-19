'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import { useStore } from '@/lib/store';
import type { NodeData } from '@/lib/types';
import ServiceNode from './ServiceNode';
import ContainerNode from './ContainerNode';
import NoteNode from './NoteNode';
import ServiceEdge from './ServiceEdge';
import EdgeEditor from './EdgeEditor';
import EdgeLegend from './EdgeLegend';
import EdgeMarkers from './EdgeMarkers';
import EmptyState from './EmptyState';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';

const nodeTypes = {
  service: ServiceNode,
  container: ContainerNode,
  note: NoteNode,
};
const edgeTypes = { service: ServiceEdge };

interface CanvasProps {
  onRequestAdd: (position?: { x: number; y: number }) => void;
}

interface EdgeEditState {
  edgeId: string;
  x: number;
  y: number;
}

interface MenuState {
  x: number;
  y: number;
  flow: { x: number; y: number };
  nodeId?: string;
}

export default function Canvas({ onRequestAdd }: CanvasProps) {
  const board = useStore((s) => s.boards.find((b) => b.id === s.activeBoardId));
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const setSelectedNode = useStore((s) => s.setSelectedNode);
  const addContainer = useStore((s) => s.addContainer);
  const addNote = useStore((s) => s.addNote);
  const duplicateNode = useStore((s) => s.duplicateNode);
  const setNodeParent = useStore((s) => s.setNodeParent);

  const { screenToFlowPosition, getIntersectingNodes, getInternalNode } =
    useReactFlow();

  const [editingEdge, setEditingEdge] = useState<EdgeEditState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const boardNodes = board?.nodes;
  const edges = board?.edges ?? [];

  // Containers must precede their children in the array; keep them first.
  const nodes = useMemo(() => {
    const list = boardNodes ?? [];
    const containers = list.filter((n) => n.type === 'container');
    const rest = list.filter((n) => n.type !== 'container');
    return [...containers, ...rest];
  }, [boardNodes]);

  const closeOverlays = useCallback(() => {
    setEditingEdge(null);
    setMenu(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setMenu(null);
    setEditingEdge({ edgeId: edge.id, x: event.clientX, y: event.clientY });
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setEditingEdge(null);
      setMenu(null);
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const e = event as React.MouseEvent;
      setEditingEdge(null);
      setMenu({
        x: e.clientX,
        y: e.clientY,
        flow: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
      });
    },
    [screenToFlowPosition],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();
      setEditingEdge(null);
      setMenu({
        x: event.clientX,
        y: event.clientY,
        flow: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        nodeId: node.id,
      });
    },
    [screenToFlowPosition],
  );

  // Drop a service/note node into (or out of) a container on drag end.
  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      if (node.type === 'container') return;
      const internal = getInternalNode(node.id);
      const nodeAbs = internal?.internals.positionAbsolute ?? node.position;

      const container = getIntersectingNodes(node).find(
        (n) => n.type === 'container',
      );

      if (container) {
        if (node.parentId === container.id) return; // already inside
        const cInternal = getInternalNode(container.id);
        const cAbs = cInternal?.internals.positionAbsolute ?? container.position;
        setNodeParent(node.id, container.id, {
          x: nodeAbs.x - cAbs.x,
          y: nodeAbs.y - cAbs.y,
        });
      } else if (node.parentId) {
        // dragged out of its container — restore absolute position
        setNodeParent(node.id, null, { x: nodeAbs.x, y: nodeAbs.y });
      }
    },
    [getIntersectingNodes, getInternalNode, setNodeParent],
  );

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('react-flow__pane')) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onRequestAdd(position);
    },
    [onRequestAdd, screenToFlowPosition],
  );

  const minimapNodeColor = useCallback((node: Node) => {
    if (node.type === 'note') return '#e2e8f0';
    const data = node.data as NodeData;
    return data.color || '#cbd5e1';
  }, []);

  const isEmpty = !boardNodes || boardNodes.length === 0;

  const defaultEdgeOptions = useMemo(
    () => ({ type: 'service', data: { style: 'standard' as const } }),
    [],
  );

  const menuItems: ContextMenuItem[] = useMemo(() => {
    if (!menu) return [];
    const items: ContextMenuItem[] = [
      {
        label: 'Add Node',
        icon: <IconPlus />,
        onClick: () => onRequestAdd(menu.flow),
      },
      {
        label: 'Add Container',
        icon: <IconBox />,
        onClick: () => addContainer(undefined, menu.flow),
      },
      {
        label: 'Add Text Note',
        icon: <IconText />,
        onClick: () => addNote(undefined, menu.flow),
      },
      {
        label: 'Duplicate Node',
        icon: <IconCopy />,
        disabled: !menu.nodeId,
        onClick: () => menu.nodeId && duplicateNode(menu.nodeId),
      },
    ];
    return items;
  }, [menu, onRequestAdd, addContainer, addNote, duplicateNode]);

  return (
    <div className="relative h-full w-full" onDoubleClick={handlePaneDoubleClick}>
      <EdgeMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => {
          setSelectedNode(null);
          closeOverlays();
        }}
        onPaneContextMenu={onPaneContextMenu}
        onMoveStart={closeOverlays}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2.5}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#d6d3d1" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={3}
          pannable
          zoomable
          className="!bottom-4 !right-4 !rounded-lg !border !border-slate-200"
        />
        <EdgeLegend />
      </ReactFlow>

      {isEmpty && <EmptyState onAddNode={() => onRequestAdd()} />}

      {editingEdge && (
        <EdgeEditor
          edgeId={editingEdge.edgeId}
          screenX={editingEdge.x}
          screenY={editingEdge.y}
          onClose={() => setEditingEdge(null)}
        />
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}
function IconText() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V5h16v2M9 19h6M12 5v14" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

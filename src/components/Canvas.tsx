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
import type { BoardEdge, ServiceNodeData } from '@/lib/types';
import ServiceNode from './ServiceNode';
import ServiceEdge from './ServiceEdge';
import EdgeEditor from './EdgeEditor';
import EdgeLegend from './EdgeLegend';
import EmptyState from './EmptyState';

const nodeTypes = { service: ServiceNode };
const edgeTypes = { service: ServiceEdge };

interface CanvasProps {
  onRequestAdd: (position?: { x: number; y: number }) => void;
}

export default function Canvas({ onRequestAdd }: CanvasProps) {
  const board = useStore((s) => s.boards.find((b) => b.id === s.activeBoardId));
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const setSelectedNode = useStore((s) => s.setSelectedNode);

  const { screenToFlowPosition } = useReactFlow();

  const [editingEdge, setEditingEdge] = useState<{
    edge: BoardEdge;
    x: number;
    y: number;
  } | null>(null);

  const nodes = board?.nodes ?? [];
  const edges = board?.edges ?? [];

  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      setEditingEdge({
        edge: edge as BoardEdge,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
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
    const data = node.data as ServiceNodeData;
    return data.color || '#cbd5e1';
  }, []);

  const isEmpty = nodes.length === 0;

  const defaultEdgeOptions = useMemo(
    () => ({ type: 'service', data: { kind: 'link' as const } }),
    [],
  );

  return (
    <div className="relative h-full w-full" onDoubleClick={handlePaneDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={() => setSelectedNode(null)}
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
          edge={editingEdge.edge}
          screenX={editingEdge.x}
          screenY={editingEdge.y}
          onClose={() => setEditingEdge(null)}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { type Node, type Edge, useNodesState, useEdgesState } from '@xyflow/react';
import { GraphCanvas } from './GraphCanvas';
import { CircleNode } from './CircleNode';
import { applyDagreLayout } from '../../pages/GraphPage';
import { NODE_TYPE_COLORS } from '../../constants/nodeTypes';
import { runBfs, findSeeds, type BfsStep } from '../../utils/bfs';
import type { GraphNode, GraphEdge } from '../../types';

const nodeTypes = { circle: CircleNode };

function shortLabel(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

function toFlowNodes(graphNodes: GraphNode[]): Node[] {
  return graphNodes.map((n) => ({
    id: n.id,
    position: { x: 0, y: 0 },
    data: { label: shortLabel(n.name), color: NODE_TYPE_COLORS[n.type] ?? '#6b7280', nodeType: n.type },
    type: 'circle',
  }));
}

function toFlowEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source_id,
    target: e.target_id,
    style: { stroke: '#475569', strokeWidth: 1 },
    markerEnd: { type: 'arrowclosed' as const, color: '#475569', width: 12, height: 12 },
  }));
}

/** Hop-level color palette */
const HOP_COLORS = [
  '#ef4444', // hop 0 - red (seed)
  '#f97316', // hop 1 - orange
  '#eab308', // hop 2 - yellow
  '#22c55e', // hop 3 - green
  '#3b82f6', // hop 4 - blue
  '#8b5cf6', // hop 5 - purple
];

interface BfsSearchPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function BfsSearchPanel({ nodes, edges }: BfsSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [maxHops, setMaxHops] = useState(3);
  const [bfsSteps, setBfsSteps] = useState<BfsStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1); // -1 = not started
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800); // ms per step
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutKey, setLayoutKey] = useState(0);

  // Build layout once from full graph data
  useEffect(() => {
    const fn = toFlowNodes(nodes);
    const fe = toFlowEdges(edges);
    const layouted = applyDagreLayout(fn, fe);
    setFlowNodes(layouted);
    setFlowEdges(fe);
    setLayoutKey((k) => k + 1);
  }, [nodes, edges, setFlowNodes, setFlowEdges]);

  // Set of all discovered node IDs up to currentStep
  const discoveredIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i <= currentStep && i < bfsSteps.length; i++) {
      for (const id of bfsSteps[i].nodeIds) {
        ids.add(id);
      }
    }
    return ids;
  }, [bfsSteps, currentStep]);

  // Which hop each node belongs to (for coloring)
  const nodeHopMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i <= currentStep && i < bfsSteps.length; i++) {
      for (const id of bfsSteps[i].nodeIds) {
        if (!map.has(id)) map.set(id, bfsSteps[i].hop);
      }
    }
    return map;
  }, [bfsSteps, currentStep]);

  // Active step node IDs (currently being highlighted with ring)
  const activeStepIds = useMemo(() => {
    if (currentStep < 0 || currentStep >= bfsSteps.length) return new Set<string>();
    return new Set(bfsSteps[currentStep].nodeIds);
  }, [bfsSteps, currentStep]);

  // Apply visual states to nodes
  const displayNodes = useMemo(() => {
    if (bfsSteps.length === 0) return flowNodes;
    return flowNodes.map((node) => {
      const hop = nodeHopMap.get(node.id);
      const isDiscovered = discoveredIds.has(node.id);
      const isActive = activeStepIds.has(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          dimmed: !isDiscovered,
          color: isDiscovered
            ? HOP_COLORS[Math.min(hop ?? 0, HOP_COLORS.length - 1)]
            : (node.data as Record<string, unknown>).color,
          ringColor: isActive ? '#ffffff' : undefined,
        },
      };
    });
  }, [flowNodes, bfsSteps, discoveredIds, nodeHopMap, activeStepIds]);

  const displayEdges = useMemo(() => {
    if (bfsSteps.length === 0) return flowEdges;
    return flowEdges.map((edge) => {
      const srcDiscovered = discoveredIds.has(edge.source);
      const tgtDiscovered = discoveredIds.has(edge.target);
      const isConnected = srcDiscovered && tgtDiscovered;
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isConnected ? '#60a5fa' : '#475569',
          strokeWidth: isConnected ? 2 : 1,
          opacity: isConnected ? 1 : 0.15,
        },
        animated: isConnected,
      };
    });
  }, [flowEdges, bfsSteps, discoveredIds]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (currentStep >= bfsSteps.length - 1) {
      setIsPlaying(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, speed);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStep, bfsSteps.length, speed]);

  const handleSearch = useCallback(() => {
    const seeds = findSeeds(query, nodes);
    if (seeds.length === 0) {
      setBfsSteps([]);
      setCurrentStep(-1);
      setIsPlaying(false);
      return;
    }
    const steps = runBfs(seeds, edges, maxHops);
    setBfsSteps(steps);
    setCurrentStep(0);
    setIsPlaying(true);
  }, [query, nodes, edges, maxHops]);

  const handleReset = useCallback(() => {
    setBfsSteps([]);
    setCurrentStep(-1);
    setIsPlaying(false);
  }, []);

  const handleStepForward = useCallback(() => {
    if (currentStep < bfsSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, bfsSteps.length]);

  const handleStepBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const totalDiscovered = discoveredIds.size;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search controls */}
      <div className="shrink-0 p-4 border-b border-border bg-bg-secondary flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="검색어 입력 (노드 이름, 타입, 속성)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
          />
          <select
            value={maxHops}
            onChange={(e) => setMaxHops(Number(e.target.value))}
            className="bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            title="최대 탐색 깊이"
          >
            {[1, 2, 3, 4, 5].map((h) => (
              <option key={h} value={h}>{h} 홉</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-500 shrink-0"
          >
            탐색
          </button>
          {bfsSteps.length > 0 && (
            <button
              onClick={handleReset}
              className="text-text-secondary hover:text-text-primary px-2 py-2 text-sm shrink-0"
            >
              초기화
            </button>
          )}
        </div>

        {/* Playback controls */}
        {bfsSteps.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleStepBack}
              disabled={currentStep <= 0}
              className="text-text-secondary hover:text-text-primary disabled:opacity-30 text-lg px-1"
              title="이전 단계"
            >
              ⏮
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-text-secondary hover:text-text-primary text-lg px-1"
              title={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={handleStepForward}
              disabled={currentStep >= bfsSteps.length - 1}
              className="text-text-secondary hover:text-text-primary disabled:opacity-30 text-lg px-1"
              title="다음 단계"
            >
              ⏭
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary"
              title="재생 속도"
            >
              <option value={1500}>느리게</option>
              <option value={800}>보통</option>
              <option value={400}>빠르게</option>
              <option value={200}>매우 빠르게</option>
            </select>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>
                단계 <span className="text-text-primary font-medium">{currentStep + 1}</span> / {bfsSteps.length}
              </span>
              <span className="text-border">|</span>
              <span>
                발견 <span className="text-text-primary font-medium">{totalDiscovered}</span> / {nodes.length} 노드
              </span>
            </div>
          </div>
        )}

        {/* Hop legend */}
        {bfsSteps.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            {bfsSteps.map((step, i) => (
              <button
                key={step.hop}
                onClick={() => { setIsPlaying(false); setCurrentStep(i); }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
                  i <= currentStep ? 'opacity-100' : 'opacity-40'
                } ${i === currentStep ? 'ring-1 ring-white/50' : ''}`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: HOP_COLORS[Math.min(i, HOP_COLORS.length - 1)] }}
                />
                <span className="text-text-secondary">
                  {step.hop === 0 ? '시드' : `${step.hop}홉`}
                  <span className="text-text-primary ml-1">({step.nodeIds.length})</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary text-sm">
            그래프 데이터가 없습니다
          </div>
        ) : (
          <GraphCanvas
            key={layoutKey}
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
          />
        )}
      </div>
    </div>
  );
}

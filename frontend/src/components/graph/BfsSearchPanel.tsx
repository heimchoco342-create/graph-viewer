import { useState, useEffect, useMemo, useCallback } from 'react';
import { type Node, type Edge, useNodesState, useEdgesState } from '@xyflow/react';
import { GraphCanvas } from './GraphCanvas';
import { CircleNode } from './CircleNode';
import { applyDagreLayout } from '../../pages/GraphPage';
import { useDomainStore } from '../../store/domainStore';
import { traverseGraph, type TraverseResult, getEmbedStatus, embedNodes, type EmbedStatus } from '../../api/search';
import type { GraphNode, GraphEdge } from '../../types';

const nodeTypes = { circle: CircleNode };

function shortLabel(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

function toFlowNodes(graphNodes: GraphNode[], colorMap: Record<string, string>): Node[] {
  return graphNodes.map((n) => ({
    id: n.id,
    position: { x: 0, y: 0 },
    data: { label: shortLabel(n.name), color: colorMap[n.type] ?? '#6b7280', nodeType: n.type },
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

/** Depth-level color palette */
const DEPTH_COLORS = [
  '#ef4444', // depth 0 - red (seed)
  '#f97316', // depth 1 - orange
  '#eab308', // depth 2 - yellow
  '#22c55e', // depth 3 - green
  '#3b82f6', // depth 4 - blue
  '#8b5cf6', // depth 5 - purple
];

interface BfsSearchPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function BfsSearchPanel({ nodes, edges }: BfsSearchPanelProps) {
  const nodeTypeColors = useDomainStore((s) => s.nodeTypeColors)();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TraverseResult[]>([]);
  const [seedCount, setSeedCount] = useState(0);
  const [totalTraversed, setTotalTraversed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [embedStatus, setEmbedStatus] = useState<EmbedStatus | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutKey, setLayoutKey] = useState(0);

  // Build layout once from full graph data
  useEffect(() => {
    const fn = toFlowNodes(nodes, nodeTypeColors);
    const fe = toFlowEdges(edges);
    const layouted = applyDagreLayout(fn, fe);
    setFlowNodes(layouted);
    setFlowEdges(fe);
    setLayoutKey((k) => k + 1);
  }, [nodes, edges, nodeTypeColors, setFlowNodes, setFlowEdges]);

  // Result node IDs by depth
  const resultMap = useMemo(() => {
    const map = new Map<string, number>(); // nodeId → depth
    for (const r of results) {
      if (!map.has(r.node_id)) {
        map.set(r.node_id, r.depth);
      }
    }
    return map;
  }, [results]);

  const resultIds = useMemo(() => new Set(resultMap.keys()), [resultMap]);

  // Depth groups for legend
  const depthGroups = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of results) {
      counts.set(r.depth, (counts.get(r.depth) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([depth, count]) => ({ depth, count }));
  }, [results]);

  // Apply visual states to nodes
  const displayNodes = useMemo(() => {
    if (!searched) return flowNodes;
    return flowNodes.map((node) => {
      const depth = resultMap.get(node.id);
      const isResult = resultIds.has(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          dimmed: !isResult,
          color: isResult
            ? DEPTH_COLORS[Math.min(depth ?? 0, DEPTH_COLORS.length - 1)]
            : (node.data as Record<string, unknown>).color,
        },
      };
    });
  }, [flowNodes, searched, resultMap, resultIds]);

  const displayEdges = useMemo(() => {
    if (!searched) return flowEdges;
    return flowEdges.map((edge) => {
      const srcResult = resultIds.has(edge.source);
      const tgtResult = resultIds.has(edge.target);
      const isConnected = srcResult && tgtResult;
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isConnected ? '#60a5fa' : '#475569',
          strokeWidth: isConnected ? 2 : 1,
          opacity: isConnected ? 1 : 0.15,
        },
        animated: false,
      };
    });
  }, [flowEdges, searched, resultIds]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setElapsed(null);
    const start = performance.now();
    try {
      const response = await traverseGraph(query);
      setElapsed(Math.round(performance.now() - start));
      setResults(response.results);
      setSeedCount(response.seed_count);
      setTotalTraversed(response.total_traversed);
      setSearched(true);
    } catch {
      setResults([]);
      setSeedCount(0);
      setTotalTraversed(0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleReset = useCallback(() => {
    setResults([]);
    setSeedCount(0);
    setTotalTraversed(0);
    setSearched(false);
  }, []);

  // Fetch embed status on mount
  useEffect(() => {
    void getEmbedStatus().then(setEmbedStatus).catch(() => {});
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search controls */}
      <div className="shrink-0 p-4 border-b border-border bg-bg-secondary flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="자연어로 검색 (재귀 탐색)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
            className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
          />
          <button
            onClick={() => void handleSearch()}
            disabled={loading || !query.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-500 shrink-0 disabled:opacity-50"
          >
            {loading ? '탐색 중...' : '탐색'}
          </button>
          {searched && (
            <button
              onClick={handleReset}
              className="text-text-secondary hover:text-text-primary px-2 py-2 text-sm shrink-0"
            >
              초기화
            </button>
          )}
        </div>

        {/* Embedding status indicator */}
        {embedStatus && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className={`inline-block w-2 h-2 rounded-full ${embedStatus.has_embedding_column && embedStatus.pending === 0 ? 'bg-green-500' : embedStatus.has_embedding_column ? 'bg-yellow-500' : 'bg-red-500'}`} />
            {embedStatus.has_embedding_column ? (
              <span>
                벡터 검색 {embedStatus.embedded}/{embedStatus.total}
                {embedStatus.pending > 0 && <span className="text-yellow-400"> ({embedStatus.pending}개 대기)</span>}
              </span>
            ) : (
              <span className="text-text-secondary">키워드 검색 (pgvector 미설치)</span>
            )}
          </div>
        )}

        {/* Results summary + depth legend */}
        {searched && (
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span>
              시드 <span className="text-text-primary font-medium">{seedCount}</span>개
            </span>
            <span className="text-border">|</span>
            <span>
              탐색 <span className="text-text-primary font-medium">{totalTraversed}</span>개
            </span>
            <span className="text-border">|</span>
            <span>
              결과 <span className="text-text-primary font-medium">{results.length}</span>개
            </span>
            {elapsed !== null && (
              <>
                <span className="text-border">|</span>
                <span>
                  <span className="text-text-primary font-medium">{elapsed >= 1000 ? `${(elapsed / 1000).toFixed(1)}s` : `${elapsed}ms`}</span>
                </span>
              </>
            )}
            {depthGroups.length > 0 && (
              <>
                <span className="text-border">|</span>
                <div className="flex items-center gap-2">
                  {depthGroups.map((g) => (
                    <span key={g.depth} className="flex items-center gap-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: DEPTH_COLORS[Math.min(g.depth, DEPTH_COLORS.length - 1)] }}
                      />
                      <span>{g.depth === 0 ? '시드' : `${g.depth}홉`} ({g.count})</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Graph canvas + results split */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Graph canvas — expands when panel is closed */}
        <div className={`relative transition-all duration-200 ${searched && results.length > 0 && panelOpen ? 'h-1/2' : 'flex-1'}`}>
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

        {/* Results panel — collapsible */}
        {searched && results.length > 0 && (
          <div className={`border-t border-border flex flex-col transition-all duration-200 ${panelOpen ? 'h-1/2' : 'h-9'}`}>
            {/* Panel header — always visible, click to toggle */}
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-bg-secondary hover:bg-bg-secondary/80 text-xs text-text-secondary cursor-pointer select-none"
            >
              <span className="flex items-center gap-2">
                <span className="text-text-primary font-medium">탐색 결과</span>
                <span>{results.length}건</span>
              </span>
              <span className={`transition-transform duration-200 ${panelOpen ? '' : 'rotate-180'}`}>
                ▼
              </span>
            </button>

            {/* Table body */}
            {panelOpen && (
              <div className="flex-1 overflow-auto bg-bg-primary">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-bg-secondary text-text-secondary text-xs">
                    <tr>
                      <th className="text-left px-3 py-1.5 w-8"></th>
                      <th className="text-left px-3 py-1.5">이름</th>
                      <th className="text-left px-3 py-1.5">타입</th>
                      <th className="text-left px-3 py-1.5">속성</th>
                      <th className="text-right px-3 py-1.5">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.node_id} className="border-t border-border hover:bg-bg-secondary/50">
                        <td className="px-3 py-1.5">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: DEPTH_COLORS[Math.min(r.depth, DEPTH_COLORS.length - 1)] }}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-text-primary font-medium">{r.name}</td>
                        <td className="px-3 py-1.5 text-text-secondary">{r.type}</td>
                        <td className="px-3 py-1.5 text-text-secondary text-xs truncate max-w-[200px]">
                          {Object.entries(r.properties).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-secondary tabular-nums">{r.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

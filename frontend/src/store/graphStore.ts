import { create } from 'zustand';
import type { GraphNode, GraphEdge } from '../types';
import * as nodesApi from '../api/nodes';
import * as edgesApi from '../api/edges';

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  error: string | null;
  loading: boolean;
  fetchNodes: () => Promise<void>;
  fetchEdges: () => Promise<void>;
  createNode: (payload: { type: string; name: string; properties?: Record<string, unknown> }) => Promise<GraphNode>;
  updateNode: (id: string, payload: { type?: string; name?: string; properties?: Record<string, unknown> }) => Promise<GraphNode>;
  deleteNode: (id: string) => Promise<void>;
  createEdge: (payload: { source_id: string; target_id: string; type: string; properties?: Record<string, unknown>; weight?: number }) => Promise<GraphEdge>;
  updateEdge: (id: string, payload: Partial<{ source_id: string; target_id: string; type: string; properties: Record<string, unknown>; weight: number }>) => Promise<GraphEdge>;
  deleteEdge: (id: string) => Promise<void>;
  setSelectedNode: (node: GraphNode | null) => void;
  setSelectedEdge: (edge: GraphEdge | null) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  error: null,
  loading: false,

  fetchNodes: async () => {
    set({ loading: true, error: null });
    try {
      const nodes = await nodesApi.getNodes();
      set({ nodes, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '노드 조회 실패';
      set({ error: message, loading: false });
    }
  },

  fetchEdges: async () => {
    set({ loading: true, error: null });
    try {
      const edges = await edgesApi.getEdges();
      set({ edges, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '엣지 조회 실패';
      set({ error: message, loading: false });
    }
  },

  createNode: async (payload) => {
    set({ error: null });
    try {
      const node = await nodesApi.createNode(payload);
      set({ nodes: [...get().nodes, node] });
      return node;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '노드 생성 실패';
      set({ error: message });
      throw err;
    }
  },

  updateNode: async (id, payload) => {
    set({ error: null });
    try {
      const updated = await nodesApi.updateNode(id, payload);
      set({ nodes: get().nodes.map((n) => (n.id === id ? updated : n)) });
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '노드 수정 실패';
      set({ error: message });
      throw err;
    }
  },

  deleteNode: async (id) => {
    set({ error: null });
    try {
      await nodesApi.deleteNode(id);
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        selectedNode: get().selectedNode?.id === id ? null : get().selectedNode,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '노드 삭제 실패';
      set({ error: message });
      throw err;
    }
  },

  createEdge: async (payload) => {
    set({ error: null });
    try {
      const edge = await edgesApi.createEdge(payload);
      set({ edges: [...get().edges, edge] });
      return edge;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '엣지 생성 실패';
      set({ error: message });
      throw err;
    }
  },

  updateEdge: async (id, payload) => {
    set({ error: null });
    try {
      const updated = await edgesApi.updateEdge(id, payload);
      set({ edges: get().edges.map((e) => (e.id === id ? updated : e)) });
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '엣지 수정 실패';
      set({ error: message });
      throw err;
    }
  },

  deleteEdge: async (id) => {
    set({ error: null });
    try {
      await edgesApi.deleteEdge(id);
      set({
        edges: get().edges.filter((e) => e.id !== id),
        selectedEdge: get().selectedEdge?.id === id ? null : get().selectedEdge,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '엣지 삭제 실패';
      set({ error: message });
      throw err;
    }
  },

  setSelectedNode: (node) => set({ selectedNode: node, selectedEdge: null }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge, selectedNode: null }),
}));

export interface GraphMeta {
  id: string;
  name: string;
  owner_id: string;
  scope: string;
  created_at: string;
}

export interface GraphDetail {
  graph: GraphMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  properties: Record<string, unknown>;
  weight: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface IngestionJob {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  result?: unknown;
  error?: string;
}

export interface PathResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_weight: number;
  found: boolean;
}

export interface SearchResponse {
  nodes: GraphNode[];
  total: number;
}

export interface Suggestion {
  id: string;
  [key: string]: unknown;
}

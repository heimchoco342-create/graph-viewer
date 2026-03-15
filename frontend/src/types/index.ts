export interface GraphMeta {
  id: string;
  name: string;
  owner_id: string;
  scope: string;
  template_id: string | null;
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

// ── Workspace Template types ──────────────────────────────

export interface LevelDefinition {
  level: number;
  node_type: string;
  label: string;
  color: string;
  badge_color: string;
  fixed: boolean;
}

export interface EdgeRule {
  source_type: string;
  target_type: string;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string | null;
  levels: LevelDefinition[];
  edge_rules: EdgeRule[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Backward compat aliases (used by existing components) ──

export type DomainNodeTypeOption = LevelDefinition;
export type DomainNodeTypeGroup = { label: string; options: LevelDefinition[] };
export type DomainEdgeTypeOption = EdgeRule;
export type DomainEdgeTypeGroup = { label: string; options: EdgeRule[] };
export type DomainConfig = WorkspaceTemplate;

import { create } from 'zustand';
import type { WorkspaceTemplate, LevelDefinition, EdgeRule } from '../types';
import { listTemplates } from '../api/templates';

export interface TemplateState {
  templates: WorkspaceTemplate[];
  activeTemplate: WorkspaceTemplate | null;
  loading: boolean;
  error: string | null;

  fetchTemplates: () => Promise<void>;
  /** @deprecated alias for fetchTemplates */
  fetchConfig: () => Promise<void>;
  setActiveTemplate: (template: WorkspaceTemplate | null) => void;

  /** Derived accessors (backward compat with domainStore) */
  nodeTypeColors: () => Record<string, string>;
  nodeTypeBadgeColors: () => Record<string, string>;
  /** Levels as optgroup-style groups for Select components */
  nodeTypeGroups: () => Array<{ label: string; options: Array<{ value: string; label: string }> }>;

  /** New accessors */
  getLevels: () => LevelDefinition[];
  getNodeTypesAtLevel: (level: number) => string[];
  isEdgeAllowed: (sourceType: string, targetType: string) => boolean;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  activeTemplate: null,
  loading: false,
  error: null,

  fetchTemplates: async () => {
    if (get().templates.length > 0) return;
    set({ loading: true, error: null });
    try {
      const templates = await listTemplates();
      set({
        templates,
        loading: false,
        activeTemplate: templates[0] ?? null,
      });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  fetchConfig: async () => get().fetchTemplates(),
  setActiveTemplate: (template) => set({ activeTemplate: template }),

  nodeTypeColors: () => {
    const t = get().activeTemplate;
    if (!t) return {};
    return Object.fromEntries(t.levels.map((l) => [l.node_type, l.color]));
  },

  nodeTypeBadgeColors: () => {
    const t = get().activeTemplate;
    if (!t) return {};
    return Object.fromEntries(t.levels.map((l) => [l.node_type, l.badge_color]));
  },

  nodeTypeGroups: () => {
    const t = get().activeTemplate;
    if (!t) return [];
    // Group all levels into a single group for Select optgroup compat
    return [{
      label: t.name,
      options: t.levels.map((l) => ({ value: l.node_type, label: l.label })),
    }];
  },

  getLevels: () => get().activeTemplate?.levels ?? [],

  getNodeTypesAtLevel: (level: number) => {
    const t = get().activeTemplate;
    if (!t) return [];
    return t.levels.filter((l) => l.level === level).map((l) => l.node_type);
  },

  isEdgeAllowed: (sourceType: string, targetType: string) => {
    const t = get().activeTemplate;
    if (!t) return true; // no template = no restriction
    return t.edge_rules.some(
      (r) => r.source_type === sourceType && r.target_type === targetType
    );
  },
}));

// Backward compat alias
export const useDomainStore = useTemplateStore;

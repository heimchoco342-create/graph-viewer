/**
 * Template-based node type re-exports.
 *
 * Components should use `useTemplateStore()` for reactive access.
 * These interfaces are kept for type compatibility.
 */

export type { LevelDefinition as NodeTypeOption } from '../types';
export type { DomainNodeTypeGroup as NodeTypeGroup } from '../types';

export { useTemplateStore as useDomainStore } from '../store/templateStore';

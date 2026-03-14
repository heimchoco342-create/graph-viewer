import { describe, it, expect } from 'vitest';
import { runBfs, findSeeds } from './bfs';

const EDGES = [
  { source_id: 'a', target_id: 'b' },
  { source_id: 'a', target_id: 'c' },
  { source_id: 'b', target_id: 'd' },
  { source_id: 'c', target_id: 'e' },
];

const NODES = [
  { id: 'a', name: '개발팀', type: 'team', properties: {} },
  { id: 'b', name: '김철수', type: 'person', properties: { role: '시니어' } },
  { id: 'c', name: '이영희', type: 'person', properties: {} },
  { id: 'd', name: 'FastAPI', type: 'tech', properties: {} },
  { id: 'e', name: 'React', type: 'tech', properties: {} },
  { id: 'f', name: '고립노드', type: 'system', properties: {} },
];

describe('runBfs', () => {
  it('returns seed nodes as hop 0', () => {
    const steps = runBfs(['a'], EDGES, 3);
    expect(steps[0]).toEqual({ hop: 0, nodeIds: ['a'] });
  });

  it('discovers direct neighbors at hop 1', () => {
    const steps = runBfs(['a'], EDGES, 3);
    expect(steps[1].hop).toBe(1);
    expect(steps[1].nodeIds.sort()).toEqual(['b', 'c']);
  });

  it('discovers 2-hop nodes', () => {
    const steps = runBfs(['a'], EDGES, 3);
    expect(steps.length).toBe(3);
    expect(steps[2].hop).toBe(2);
    expect(steps[2].nodeIds.sort()).toEqual(['d', 'e']);
  });

  it('respects maxHops limit', () => {
    const steps = runBfs(['a'], EDGES, 1);
    expect(steps.length).toBe(2);
    const allIds = steps.flatMap((s) => s.nodeIds);
    expect(allIds).not.toContain('d');
  });

  it('handles multiple seeds', () => {
    const steps = runBfs(['b', 'c'], EDGES, 1);
    expect(steps[0].nodeIds.sort()).toEqual(['b', 'c']);
    expect(steps[1].nodeIds.sort()).toEqual(['a', 'd', 'e']);
  });

  it('does not revisit nodes', () => {
    const steps = runBfs(['a'], EDGES, 5);
    const allIds = steps.flatMap((s) => s.nodeIds);
    expect(allIds.length).toBe(new Set(allIds).size);
  });

  it('stops when no more nodes to discover', () => {
    const steps = runBfs(['a'], EDGES, 10);
    expect(steps.length).toBe(3);
  });

  it('handles empty seeds', () => {
    const steps = runBfs([], EDGES, 3);
    expect(steps).toEqual([{ hop: 0, nodeIds: [] }]);
  });
});

describe('findSeeds', () => {
  it('finds by name', () => {
    expect(findSeeds('김철수', NODES)).toEqual(['b']);
  });

  it('finds by type', () => {
    const seeds = findSeeds('person', NODES);
    expect(seeds.sort()).toEqual(['b', 'c']);
  });

  it('finds by properties', () => {
    expect(findSeeds('시니어', NODES)).toEqual(['b']);
  });

  it('returns empty for no match', () => {
    expect(findSeeds('존재하지않는', NODES)).toEqual([]);
  });

  it('returns empty for empty query', () => {
    expect(findSeeds('', NODES)).toEqual([]);
  });

  it('is case insensitive', () => {
    expect(findSeeds('fastapi', NODES)).toEqual(['d']);
  });
});

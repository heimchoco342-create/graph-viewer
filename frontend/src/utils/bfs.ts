/** BFS result: which node IDs were discovered at each hop */
export interface BfsStep {
  hop: number;
  nodeIds: string[];
}

interface EdgeLike {
  source_id: string;
  target_id: string;
}

/** Run BFS from seed nodes, returning traversal steps grouped by hop */
export function runBfs(
  seeds: string[],
  edges: EdgeLike[],
  maxHops: number,
): BfsStep[] {
  const visited = new Set<string>(seeds);
  const steps: BfsStep[] = [{ hop: 0, nodeIds: [...seeds] }];

  let frontier = [...seeds];
  for (let hop = 1; hop <= maxHops; hop++) {
    const nextFrontier: string[] = [];
    for (const nodeId of frontier) {
      for (const e of edges) {
        const neighbor =
          e.source_id === nodeId ? e.target_id :
          e.target_id === nodeId ? e.source_id :
          null;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }
    if (nextFrontier.length === 0) break;
    steps.push({ hop, nodeIds: nextFrontier });
    frontier = nextFrontier;
  }

  return steps;
}

interface NodeLike {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
}

/** Find seed nodes by keyword match (name, type, or properties) */
export function findSeeds(query: string, nodes: NodeLike[]): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return nodes
    .filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        JSON.stringify(n.properties).toLowerCase().includes(q),
    )
    .map((n) => n.id);
}

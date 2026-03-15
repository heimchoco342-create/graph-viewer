import { useRef, useEffect, useCallback, useMemo } from 'react';
import ForceGraph3D, { type ForceGraph3DInstance } from 'react-force-graph-3d';
import { useDomainStore } from '../../store/domainStore';
import * as THREE from 'three';

export interface Graph3DNode {
  id: string;
  name: string;
  type: string;
  val?: number;
}

export interface Graph3DLink {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface Graph3DCanvasProps {
  nodes: Graph3DNode[];
  links: Graph3DLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: Graph3DNode) => void;
  onBackgroundClick?: () => void;
  focusedNodeId?: string | null;
}

export function Graph3DCanvas({
  nodes,
  links,
  width,
  height,
  onNodeClick,
  onBackgroundClick,
  focusedNodeId,
}: Graph3DCanvasProps) {
  const nodeTypeColors = useDomainStore((s) => s.nodeTypeColors)();
  const fgRef = useRef<ForceGraph3DInstance | undefined>();

  const focusedConnectedIds = useMemo(() => {
    if (!focusedNodeId) return null;
    const ids = new Set<string>([focusedNodeId]);
    links.forEach((l) => {
      const src = typeof l.source === 'object' ? (l.source as Graph3DNode).id : l.source;
      const tgt = typeof l.target === 'object' ? (l.target as Graph3DNode).id : l.target;
      if (src === focusedNodeId) ids.add(tgt);
      if (tgt === focusedNodeId) ids.add(src);
    });
    return ids;
  }, [focusedNodeId, links]);

  const graphData = useMemo(
    () => ({ nodes: [...nodes], links: [...links] }),
    [nodes, links],
  );

  // Configure forces and zoom to fit on data change
  useEffect(() => {
    const fg = fgRef.current;
    if (fg) {
      fg.d3Force('charge')?.strength(-30);
      fg.d3Force('link')?.distance(30);
    }
    const timer = setTimeout(() => {
      fgRef.current?.zoomToFit(600, 20);
    }, 2000);
    return () => clearTimeout(timer);
  }, [nodes.length, links.length]);

  const handleNodeClick = useCallback(
    (node: object) => {
      onNodeClick?.(node as Graph3DNode);

      // Camera focus on clicked node
      const fg = fgRef.current;
      if (!fg) return;
      const n = node as Graph3DNode & { x?: number; y?: number; z?: number };
      const distance = 120;
      const distRatio = 1 + distance / Math.hypot(n.x ?? 0, n.y ?? 0, n.z ?? 0);
      fg.cameraPosition(
        { x: (n.x ?? 0) * distRatio, y: (n.y ?? 0) * distRatio, z: (n.z ?? 0) * distRatio },
        { x: n.x ?? 0, y: n.y ?? 0, z: n.z ?? 0 },
        1000,
      );
    },
    [onNodeClick],
  );

  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  const nodeThreeObject = useCallback(
    (node: object) => {
      const n = node as Graph3DNode;
      const color = nodeTypeColors[n.type] ?? '#6b7280';
      const isActive = !focusedConnectedIds || focusedConnectedIds.has(n.id);
      const opacity = isActive ? 1 : 0.15;
      const size = n.type === 'organization' ? 5 : n.type === 'team' ? 4 : 3;

      const group = new THREE.Group();

      // Sphere — use MeshBasicMaterial (no lighting needed)
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
      });
      const sphere = new THREE.Mesh(geometry, material);
      group.add(sphere);

      // Text label
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.3)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = n.name.length > 16 ? n.name.slice(0, 14) + '..' : n.name;
      ctx.fillText(label, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(20, 5, 1);
      sprite.position.set(0, size + 3, 0);
      group.add(sprite);

      return group;
    },
    [focusedConnectedIds],
  );

  const linkColor = useCallback(
    (link: object) => {
      if (!focusedConnectedIds) return 'rgba(100, 116, 139, 0.4)';
      const l = link as Graph3DLink & { source: Graph3DNode | string; target: Graph3DNode | string };
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      const isConnected = focusedConnectedIds.has(src) && focusedConnectedIds.has(tgt);
      return isConnected ? 'rgba(96, 165, 250, 0.8)' : 'rgba(100, 116, 139, 0.1)';
    },
    [focusedConnectedIds],
  );

  const linkWidth = useCallback(
    (link: object) => {
      if (!focusedConnectedIds) return 0.5;
      const l = link as Graph3DLink & { source: Graph3DNode | string; target: Graph3DNode | string };
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      return focusedConnectedIds.has(src) && focusedConnectedIds.has(tgt) ? 1.5 : 0.3;
    },
    [focusedConnectedIds],
  );

  return (
    <div data-testid="graph-3d-canvas" style={{ width: '100%', height: '100%' }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={width}
        height={height}
        nodeId="id"
        nodeThreeObject={nodeThreeObject}
        linkSource="source"
        linkTarget="target"
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.6}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        backgroundColor="#0f172a"
        showNavInfo={false}
      />
    </div>
  );
}

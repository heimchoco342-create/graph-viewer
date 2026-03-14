import { Handle, Position, type NodeProps } from '@xyflow/react';

export function CircleNode({ data }: NodeProps) {
  const { label, color } = data as { label: string; color: string };

  return (
    <div
      className="flex items-center justify-center text-white text-xs font-medium text-center leading-tight"
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: color ?? '#6b7280',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        padding: 8,
        wordBreak: 'break-word',
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <span>{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

import { Handle, Position, type NodeProps } from '@xyflow/react';

export function CircleNode({ data }: NodeProps) {
  const { label, color } = data as { label: string; color: string };

  return (
    <div className="flex flex-col items-center" style={{ width: 60 }}>
      <div
        title={label}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: color ?? '#6b7280',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          cursor: 'pointer',
        }}
      >
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
      <span
        className="text-text-secondary text-center leading-tight mt-1"
        style={{ fontSize: 9, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
    </div>
  );
}

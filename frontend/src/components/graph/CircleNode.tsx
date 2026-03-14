import { Handle, Position, type NodeProps } from '@xyflow/react';

export function CircleNode({ data }: NodeProps) {
  const { label, color, dimmed, ringColor } = data as { label: string; color: string; dimmed?: boolean; ringColor?: string };

  return (
    <div
      className="flex flex-col items-center transition-opacity duration-200"
      style={{ width: 60, opacity: dimmed ? 0.35 : 1 }}
    >
      <div
        title={label}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: color ?? '#6b7280',
          boxShadow: ringColor
            ? `0 0 0 3px ${ringColor}, 0 0 12px ${ringColor}`
            : '0 2px 8px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transition: 'box-shadow 0.3s ease',
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

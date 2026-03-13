import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

export interface NodeDetailProps {
  id: string
  label: string
  type: string
  properties?: Record<string, string>
  onClose?: () => void
}

export function NodeDetail({
  id,
  label,
  type,
  properties = {},
  onClose,
}: NodeDetailProps) {
  return (
    <Card title="노드 상세">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-text-primary font-medium">{label}</h4>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-sm"
            aria-label="Close node detail"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Badge label={type} />
          <span className="text-xs text-text-muted">ID: {id}</span>
        </div>
        {Object.keys(properties).length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {Object.entries(properties).map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-text-muted">{key}</span>
                <span className="text-text-secondary">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

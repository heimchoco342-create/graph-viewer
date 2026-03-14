import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

export interface EdgeDetailProps {
  id: string
  source: string
  target: string
  label?: string
  properties?: Record<string, unknown>
  onClose?: () => void
}

export function EdgeDetail({
  id,
  source,
  target,
  label,
  properties = {},
  onClose,
}: EdgeDetailProps) {
  return (
    <Card title="엣지 상세">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-text-primary text-sm">
            {source} → {target}
          </span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-sm"
            aria-label="Close edge detail"
          >
            ✕
          </button>
        </div>
        {label && <Badge label={label} />}
        <span className="text-xs text-text-muted">ID: {id}</span>
        {Object.keys(properties).length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {Object.entries(properties).map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-text-muted">{key}</span>
                <span className="text-text-secondary">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

import { Select, type SelectOption } from '../ui/Select'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export interface PathStep {
  nodeId: string
  nodeLabel: string
  edgeLabel?: string
}

export interface PathFinderProps {
  nodeOptions?: SelectOption[]
  sourceValue?: string
  targetValue?: string
  pathResult?: PathStep[]
  onSourceChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onTargetChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onSearch?: () => void
}

export function PathFinder({
  nodeOptions = [],
  sourceValue,
  targetValue,
  pathResult,
  onSourceChange,
  onTargetChange,
  onSearch,
}: PathFinderProps) {
  return (
    <Card title="경로 탐색">
      <div className="flex flex-col gap-4">
        <Select
          label="출발 노드"
          options={nodeOptions}
          value={sourceValue}
          onChange={onSourceChange}
        />
        <Select
          label="도착 노드"
          options={nodeOptions}
          value={targetValue}
          onChange={onTargetChange}
        />
        <Button onClick={onSearch}>경로 검색</Button>
        {pathResult && pathResult.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <h4 className="text-sm font-medium text-text-primary">
              검색 결과
            </h4>
            <div className="flex items-center gap-1 flex-wrap text-sm">
              {pathResult.map((step, idx) => (
                <span key={step.nodeId} className="flex items-center gap-1">
                  <span className="text-accent font-medium">
                    {step.nodeLabel}
                  </span>
                  {idx < pathResult.length - 1 && step.edgeLabel && (
                    <span className="text-text-muted">
                      —[{step.edgeLabel}]→
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

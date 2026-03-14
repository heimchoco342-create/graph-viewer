import { NodeSearchInput, type NodeOption } from '../ui/NodeSearchInput'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export interface PathStep {
  nodeId: string
  nodeLabel: string
  edgeLabel?: string
}

export interface PathFinderProps {
  nodes?: NodeOption[]
  sourceValue?: string
  targetValue?: string
  pathResult?: PathStep[]
  onSourceChange?: (nodeId: string) => void
  onTargetChange?: (nodeId: string) => void
  onSearch?: () => void
}

export function PathFinder({
  nodes = [],
  sourceValue = '',
  targetValue = '',
  pathResult,
  onSourceChange,
  onTargetChange,
  onSearch,
}: PathFinderProps) {
  return (
    <Card title="경로 탐색">
      <div className="flex flex-col gap-4">
        <NodeSearchInput
          label="출발 노드"
          placeholder="출발 노드를 검색하세요..."
          nodes={nodes}
          value={sourceValue}
          onChange={(id) => onSourceChange?.(id)}
        />
        <NodeSearchInput
          label="도착 노드"
          placeholder="도착 노드를 검색하세요..."
          nodes={nodes}
          value={targetValue}
          onChange={(id) => onTargetChange?.(id)}
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

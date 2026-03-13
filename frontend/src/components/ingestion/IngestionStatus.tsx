import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

export interface IngestionJob {
  id: string
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
}

export interface IngestionStatusProps {
  jobs: IngestionJob[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-text-muted',
  processing: 'bg-accent',
  completed: 'bg-success',
  failed: 'bg-danger',
}

const statusLabels: Record<string, string> = {
  pending: '대기',
  processing: '처리 중',
  completed: '완료',
  failed: '실패',
}

export function IngestionStatus({ jobs }: IngestionStatusProps) {
  return (
    <Card title="처리 상태">
      {jobs.length === 0 ? (
        <p className="text-sm text-text-muted">처리 중인 작업이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-text-primary truncate mr-2">
                {job.fileName}
              </span>
              <div className="flex items-center gap-2">
                {job.progress !== undefined && (
                  <span className="text-text-muted">{job.progress}%</span>
                )}
                <Badge
                  label={statusLabels[job.status]}
                  color={statusColors[job.status]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'

export interface NodeFormData {
  label?: string
  type?: string
  description?: string
}

export interface NodeFormProps {
  initialData?: NodeFormData
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel?: () => void
}

const nodeTypeOptions = [
  { value: 'person', label: 'Person' },
  { value: 'team', label: 'Team' },
  { value: 'project', label: 'Project' },
  { value: 'tech', label: 'Tech' },
  { value: 'system', label: 'System' },
  { value: 'document', label: 'Document' },
]

export function NodeForm({ initialData, onSubmit, onCancel }: NodeFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        label="이름"
        placeholder="노드 이름"
        value={initialData?.label}
        name="label"
      />
      <Select
        label="타입"
        options={nodeTypeOptions}
        value={initialData?.type}
        name="type"
      />
      <Input
        label="설명"
        placeholder="노드 설명"
        value={initialData?.description}
        name="description"
      />
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">저장</Button>
      </div>
    </form>
  )
}

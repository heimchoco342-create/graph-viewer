import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { useDomainStore } from '../../store/domainStore'

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

export function NodeForm({ initialData, onSubmit, onCancel }: NodeFormProps) {
  const nodeTypeGroups = useDomainStore((s) => s.nodeTypeGroups)()

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
        options={nodeTypeGroups}
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

import { Input } from '../ui/Input'
import { Select, type SelectOption } from '../ui/Select'
import { Button } from '../ui/Button'

export interface EdgeFormData {
  source?: string
  target?: string
  label?: string
}

export interface EdgeFormProps {
  initialData?: EdgeFormData
  nodeOptions?: SelectOption[]
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel?: () => void
}

export function EdgeForm({
  initialData,
  nodeOptions = [],
  onSubmit,
  onCancel,
}: EdgeFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Select
        label="출발 노드"
        options={nodeOptions}
        value={initialData?.source}
        name="source"
      />
      <Select
        label="도착 노드"
        options={nodeOptions}
        value={initialData?.target}
        name="target"
      />
      <Input
        label="관계 이름"
        placeholder="관계 라벨"
        value={initialData?.label}
        name="label"
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

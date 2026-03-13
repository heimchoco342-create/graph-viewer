export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label?: string
  options: SelectOption[]
  value?: string
  name?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function Select({ label, options, value, name, onChange }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-text-secondary">{label}</label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="rounded-lg border border-border px-3 py-2 bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

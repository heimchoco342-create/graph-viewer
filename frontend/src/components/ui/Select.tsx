export interface SelectOption {
  value: string
  label: string
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

export interface SelectProps {
  label?: string
  options: SelectOption[] | SelectOptionGroup[]
  value?: string
  name?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

function isGrouped(options: SelectOption[] | SelectOptionGroup[]): options is SelectOptionGroup[] {
  return options.length > 0 && 'options' in options[0]
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
        {isGrouped(options)
          ? options.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))
          : options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
      </select>
    </div>
  )
}

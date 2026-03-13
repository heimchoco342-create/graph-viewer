export interface InputProps {
  label?: string
  placeholder?: string
  error?: string
  value?: string
  name?: string
  type?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function Input({
  label,
  placeholder,
  error,
  value,
  name,
  type = 'text',
  onChange,
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-text-secondary">{label}</label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={`rounded-lg border px-3 py-2 bg-bg-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
          error ? 'border-danger' : 'border-border'
        }`}
      />
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  )
}

export interface SearchResult {
  id: string
  label: string
  type: string
}

export interface SearchBarProps {
  placeholder?: string
  value?: string
  results?: SearchResult[]
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onResultClick?: (result: SearchResult) => void
}

export function SearchBar({
  placeholder = '노드 검색...',
  value,
  results = [],
  onChange,
  onResultClick,
}: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="w-full rounded-lg border border-border px-4 py-2 bg-bg-secondary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-bg-secondary shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <li key={result.id}>
              <button
                onClick={() => onResultClick?.(result)}
                className="w-full text-left px-4 py-2 hover:bg-bg-tertiary text-text-primary text-sm flex justify-between items-center"
              >
                <span>{result.label}</span>
                <span className="text-xs text-text-muted">{result.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

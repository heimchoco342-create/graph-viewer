export interface HeaderProps {
  title: string
  userName?: string
}

export function Header({ title, userName }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-secondary">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {userName && (
        <span className="text-sm text-text-secondary">{userName}</span>
      )}
    </header>
  )
}

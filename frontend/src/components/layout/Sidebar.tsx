export interface SidebarMenuItem {
  label: string
  icon: string
  active?: boolean
}

export interface SidebarProps {
  menuItems?: SidebarMenuItem[]
  onMenuClick?: (label: string) => void
}

const defaultMenuItems: SidebarMenuItem[] = [
  { label: '그래프', icon: '🔗', active: true },
  { label: '검색', icon: '🔍' },
  { label: '업로드', icon: '📤' },
  { label: '설정', icon: '⚙️' },
]

export function Sidebar({
  menuItems = defaultMenuItems,
  onMenuClick,
}: SidebarProps) {
  return (
    <aside className="w-[280px] bg-bg-secondary border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary">Knowledge Graph</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => onMenuClick?.(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  item.active
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

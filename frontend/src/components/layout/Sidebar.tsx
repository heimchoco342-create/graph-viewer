import { useState } from 'react'

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
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`shrink-0 bg-bg-secondary border-r border-border flex flex-col transition-[width] duration-200 ${
        collapsed ? 'w-[52px]' : 'w-[200px]'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <h1 className="text-xl font-bold text-text-primary leading-tight">
            WNG
          </h1>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-text-secondary hover:text-text-primary text-sm shrink-0"
          aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
      <nav className="flex-1 p-2">
        <ul className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => onMenuClick?.(item.label)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  item.active
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <span>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

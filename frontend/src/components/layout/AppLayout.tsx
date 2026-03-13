import type { ReactNode } from 'react'

export interface AppLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

export function AppLayout({ sidebar, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-bg-primary">
      {sidebar}
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}

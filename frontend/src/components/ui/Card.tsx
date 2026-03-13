import type { ReactNode } from 'react'

export interface CardProps {
  title?: string
  children: ReactNode
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      {title && (
        <h3 className="text-base font-semibold text-text-primary mb-3">
          {title}
        </h3>
      )}
      <div>{children}</div>
    </div>
  )
}

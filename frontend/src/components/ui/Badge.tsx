export interface BadgeProps {
  label: string
  color?: string
}

export function Badge({ label, color = 'bg-accent' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${color}`}
    >
      {label}
    </span>
  )
}

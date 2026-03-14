export function WngLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Edges */}
      <line x1="20" y1="18" x2="44" y2="18" stroke="#475569" strokeWidth="2" />
      <line x1="20" y1="18" x2="14" y2="44" stroke="#475569" strokeWidth="2" />
      <line x1="44" y1="18" x2="50" y2="44" stroke="#475569" strokeWidth="2" />
      <line x1="14" y1="44" x2="50" y2="44" stroke="#475569" strokeWidth="2" />
      <line x1="14" y1="44" x2="32" y2="56" stroke="#475569" strokeWidth="2" />
      <line x1="50" y1="44" x2="32" y2="56" stroke="#475569" strokeWidth="2" />

      {/* Nodes */}
      <circle cx="20" cy="18" r="7" fill="#3b82f6" />
      <circle cx="44" cy="18" r="7" fill="#a855f7" />
      <circle cx="14" cy="44" r="7" fill="#22c55e" />
      <circle cx="50" cy="44" r="7" fill="#f97316" />
      <circle cx="32" cy="56" r="7" fill="#ef4444" />

      {/* Center accent node */}
      <circle cx="32" cy="34" r="5" fill="#60a5fa" opacity="0.6" />
      <line x1="20" y1="18" x2="32" y2="34" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" />
      <line x1="44" y1="18" x2="32" y2="34" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" />
      <line x1="14" y1="44" x2="32" y2="34" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" />
      <line x1="50" y1="44" x2="32" y2="34" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

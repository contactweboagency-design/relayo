export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#059669" />
        <path d="M9 11.5a3.5 3.5 0 0 1 3.5-3.5h7a3.5 3.5 0 0 1 0 7H15l-4 4v-4.2A3.5 3.5 0 0 1 9 11.5Z" fill="#fff" />
        <circle cx="21" cy="21.5" r="3.5" fill="#fbbf24" />
      </svg>
      Relayo
    </span>
  );
}

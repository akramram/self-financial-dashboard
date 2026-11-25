import { RefreshCw } from 'lucide-react';

/**
 * Loading state aksesibel yang konsisten: spinner berputar (aria-hidden) +
 * label, diumumkan ke screen reader via role="status" aria-live="polite".
 * Kontras AA light (slate-600) + dark (white/60). Padding via `className`.
 */
export default function LoadingState({
  label,
  className = 'py-8',
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2 text-center text-sm text-slate-600 dark:text-white/60 ${className}`}
    >
      <RefreshCw
        className="h-5 w-5 animate-spin text-emerald-700 dark:text-emerald-400"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

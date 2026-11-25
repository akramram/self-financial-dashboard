import type { LucideIcon } from 'lucide-react';

/**
 * Empty state konsisten: ikon dekoratif (aria-hidden, opacity rendah — grafis
 * 3:1 tak wajib) + pesan + hint opsional. Kontras AA: slate-600 / white/60.
 * Action opsional (CTA link) untuk mengarahkan langkah pertama user.
 */
export default function EmptyState({
  icon: Icon,
  message,
  hint,
  action,
  className = 'py-12',
}: {
  icon: LucideIcon;
  message: string;
  hint?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={`text-center text-sm text-slate-600 dark:text-white/60 ${className}`}
      aria-live="polite"
    >
      <Icon aria-hidden="true" className="w-8 h-8 mx-auto mb-3 opacity-30" />
      {message}
      {hint && <div className="mt-1 text-xs text-slate-500 dark:text-white/50">{hint}</div>}
      {action && (
        <div className="mt-2">
          <a
            href={action.href}
            className="inline-flex items-center gap-1 min-h-[44px] px-4 font-medium text-emerald-700 dark:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded-lg"
          >
            {action.label}
          </a>
        </div>
      )}
    </div>
  );
}

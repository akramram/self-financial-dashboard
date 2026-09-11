import React, { useEffect, useState } from 'react';
import { Trophy, X, Sparkles } from 'lucide-react';
import { formatIdr } from '../lib/utils';

export interface CrossedMilestone {
  target: number;
  label: string;
  tier: string;
  icon: string;
}

interface Props {
  /** Milestones newly crossed by the just-saved entry */
  milestones: CrossedMilestone[];
  /** Next locked milestone (context: "X to go") */
  next?: { target: number; label: string } | null;
  total?: number;
  onClose: () => void;
}

/**
 * Full-screen milestone celebration overlay — gradient glow, badge stack,
 * confetti-lite (CSS particles), auto-dismiss ~6s. Rendered after a networth
 * save crosses one or more IDR thresholds.
 */
export default function MilestoneCelebration({ milestones, next, total, onClose }: Props) {
  const [closing, setClosing] = useState(false);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

  // Auto-dismiss (reset on milestone change)
  useEffect(() => {
    if (milestones.length === 0) return;
    const t = setTimeout(close, 6500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones]);

  // Escape to close
  useEffect(() => {
    if (milestones.length === 0) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones]);

  if (milestones.length === 0) return null;

  const confetti = Array.from({ length: 24 }, (_, i) => i);
  const confettiColors = ['#34d399', '#0ea5e9', '#f59e0b', '#fbbf24', '#f97316'];
  const remaining = next && total != null ? next.target - total : null;

  return (
    <div
      role="dialog"
      aria-label="Net worth milestone reached"
      className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-opacity duration-250 ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.72)', backdropFilter: 'blur(8px)' }}
      onClick={close}
    >
      {/* Confetti particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((i) => (
          <span
            key={i}
            className="absolute block rounded-sm animate-[nw-confetti_2.8s_ease-in_infinite]"
            style={{
              left: `${(i * 41) % 100}%`,
              top: '-4%',
              width: i % 3 === 0 ? '8px' : '6px',
              height: i % 4 === 0 ? '14px' : '10px',
              backgroundColor: confettiColors[i % confettiColors.length],
              animationDelay: `${(i % 8) * 0.35}s`,
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'nw-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Gradient top */}
        <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #34d399 0%, #0ea5e9 60%, #f59e0b 130%)' }}>
          <button
            onClick={close}
            aria-label="Close celebration"
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/15 hover:bg-black/30 transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="absolute inset-0 flex items-end justify-center">
            <Sparkles className="w-5 h-5 text-white/40 mb-3" />
          </div>
        </div>

        <div className="px-6 pb-6 -mt-8 text-center">
          {/* Badges */}
          <div className={`flex justify-center ${milestones.length > 1 ? '-space-x-3' : ''}`}>
            {milestones.map((m) => (
              <div
                key={m.target}
                className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-3xl"
                style={{ animation: 'nw-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards', animationDelay: '0.15s' }}
              >
                {m.icon}
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Milestone Reached
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {milestones.length === 1
              ? `${milestones[0].label} Club!`
              : `${milestones.length} Milestones Unlocked!`}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Net worth kamu sekarang <span className="font-semibold text-slate-800 dark:text-white">{formatIdr(total ?? milestones[milestones.length - 1].target)}</span> 🎉
          </p>

          {remaining != null && remaining > 0 && next && (
            <div className="mt-4 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-gold-500" />
              <span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{formatIdr(remaining)}</span> lagi menuju {next.label} Club
              </span>
            </div>
          )}

          <a
            href="/achievements"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-900 no-underline transition-transform hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #34d399, #0ea5e9)' }}
          >
            <Trophy className="w-4 h-4" />
            Lihat Achievements
          </a>
        </div>
      </div>
    </div>
  );
}

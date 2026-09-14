import React, { useState, useEffect } from 'react';
import { HeartPulse } from 'lucide-react';
import { motion } from 'motion/react';

interface HealthChipProps {
  /** Reuse an already-fetched /api/health response (dashboard refetches on data change) */
  data?: { overall: number; grade: string; gradeColor: string; trend?: string; prevScore?: number | null } | null;
  onClick?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 65) return '#34d399';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

/**
 * Compact health-score glance chip for the dashboard PULSE section.
 * Small SVG ring gauge + score + trend, clickable to /health.
 */
export default function HealthChip({ data, onClick }: HealthChipProps) {
  const [health, setHealth] = useState(data ?? null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => { setHealth(data ?? null); setLoading(false); }, [data]);

  useEffect(() => {
    if (data !== undefined) return; // parent supplies data (null = parent still loading)
    let cancelled = false;
    fetch('/api/health')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (!cancelled) { setHealth(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [data]);

  const score = health?.overall ?? null;
  const color = score != null ? scoreColor(score) : '#94a3b8';
  const trendDelta = health?.prevScore != null && health?.trend && health.trend !== 'new' ? score! - health.prevScore : null;

  // Ring gauge geometry
  const r = 15.5; const stroke = 3; const c = 2 * Math.PI * r;
  const offset = score != null ? c - (score / 100) * c : c;

  return (
    <motion.div
      className="relative p-4 rounded-2xl group bg-slate-100 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/[0.06] cursor-pointer"
      onClick={onClick ?? (() => { window.location.href = '/health'; })}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      role="link"
      aria-label={`Health score ${score ?? 'loading'} of 100, view details`}
    >
      {/* Radar glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${color}14, transparent 60%)` }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color }} className="shrink-0">
              <HeartPulse className="w-4 h-4" />
            </span>
            <p className="text-xs font-medium text-slate-500 dark:text-white/40">Health</p>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1.5">
            {loading ? (
              <span className="text-lg font-bold text-slate-400 dark:text-white/40">—</span>
            ) : (
              <>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{score ?? '—'}</span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-white/40">/100</span>
                {health?.grade && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}1a`, color }}>
                    {health.grade}
                  </span>
                )}
              </>
            )}
          </div>

          {trendDelta != null && trendDelta !== 0 && (
            <motion.div
              key={trendDelta}
              className="flex items-center gap-1"
              style={{ color: trendDelta > 0 ? '#10b981' : '#ef4444' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <span className="text-xs font-semibold">{trendDelta > 0 ? '▲' : '▼'} {Math.abs(trendDelta)} pts</span>
              <span className="text-[10px] opacity-60">vs last</span>
            </motion.div>
          )}
          {(trendDelta == null || trendDelta === 0) && !loading && (
            <p className="text-xs font-semibold text-slate-500 dark:text-white/50">composite score</p>
          )}
        </div>

        {/* Mini ring gauge */}
        <div className="ml-2 shrink-0 self-center relative" style={{ width: 38, height: 38 }}>
          <svg width={38} height={38} className="-rotate-90">
            <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} className="text-slate-300 dark:text-white/15" r={r} cx={19} cy={19} />
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${c} ${c}`}
              style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-in-out' }}
              r={r}
              cx={19} cy={19}
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

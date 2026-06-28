import React, { useState, useMemo, useEffect } from 'react';
import { formatIdr } from '../lib/utils';
import {
  Flame,
  Trophy,
  CalendarDays,
  TrendingDown,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// ============================================================
// NOTE: this data shape must match StreakResult in src/lib/db.ts.
// We re-declare it locally (rather than importing from a server-only
// module) so the client bundle stays clean. Any nested objects are
// fetched at runtime from /api/streaks (NOT passed as Astro props),
// which sidesteps the devalue serialization pitfall documented in
// astro-pm2-hydration-fix.
// ============================================================
interface StreakDay {
  date: string;
  dow: number;
  isNoSpend: boolean;
  txCount: number;
  total: number;
}
interface DayOfWeekPattern {
  dow: number;
  label: string;
  spendDays: number;
  noSpendDays: number;
  totalSpend: number;
  avgPerSpendDay: number;
}
interface StreakBadge {
  id: string;
  label: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
}
interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  todayIsNoSpend: boolean;
  yesterdayWasNoSpend: boolean;
  noSpendLast30: number;
  noSpendLast90: number;
  totalDaysTracked: number;
  firstTrackedDate: string | null;
  recentDays: StreakDay[];
  dowPattern: DayOfWeekPattern[];
  badges: StreakBadge[];
  recentNoSpendDays: string[];
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DOW_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// Heat color for a spend day (no-spend days are emerald; spend days scale with intensity)
function spendIntensity(total: number): string {
  if (total <= 0) return '';
  // Buckets: <200k, <500k, <1M, <2M, >=2M
  if (total < 200000) return 'bg-amber-200 dark:bg-amber-900/50';
  if (total < 500000) return 'bg-amber-300 dark:bg-amber-800/60';
  if (total < 1000000) return 'bg-orange-300 dark:bg-orange-800/70';
  if (total < 2000000) return 'bg-orange-400 dark:bg-orange-700/80';
  return 'bg-red-500 dark:bg-red-600/90';
}

export default function SpendingStreaks() {
  const [data, setData] = useState<StreakResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<StreakDay | null>(null);
  const [dayTransactions, setDayTransactions] = useState<any[] | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    fetch('/api/streaks')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: StreakResult) => setData(d))
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Day-of-week pattern: find the heaviest weekday for actionable insight
  const heaviestWeekday = useMemo(() => {
    if (!data) return null;
    const sorted = [...data.dowPattern].sort((a, b) => b.avgPerSpendDay - a.avgPerSpendDay);
    return sorted[0] ?? null;
  }, [data]);

  const bestWeekday = useMemo(() => {
    if (!data) return null;
    // Best = highest no-spend ratio
    const enriched = data.dowPattern.map((d) => {
      const total = d.spendDays + d.noSpendDays;
      return { ...d, noSpendRatio: total > 0 ? d.noSpendDays / total : 0 };
    });
    enriched.sort((a, b) => b.noSpendRatio - a.noSpendRatio);
    return enriched[0] ?? null;
  }, [data]);

  const openDayDialog = async (day: StreakDay) => {
    setSelectedDay(day);
    setDayTransactions(null);
    setDialogLoading(true);
    try {
      const res = await fetch(`/api/transactions-by-date?day=${encodeURIComponent(day.date)}`);
      if (res.ok) {
        const json = await res.json();
        setDayTransactions(Array.isArray(json) ? json : []);
      } else {
        setDayTransactions([]);
      }
    } catch {
      setDayTransactions([]);
    } finally {
      setDialogLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400">
        <div className="animate-pulse">Loading streaks…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-700 dark:text-red-400 font-medium">Couldn't load streaks</p>
        <p className="text-sm text-red-500 dark:text-red-500/80 mt-1">{error || 'No data'}</p>
      </div>
    );
  }

  const noSpendRatio30 = data.totalDaysTracked > 0
    ? Math.round((data.noSpendLast30 / Math.min(30, data.totalDaysTracked)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ===== Headline streak cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current streak */}
        <div className={`rounded-xl border p-6 shadow-sm transition ${
          data.currentStreak > 0
            ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 border-orange-200 dark:border-orange-800'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Current Streak
            </p>
            <Flame className={`w-5 h-5 ${data.currentStreak > 0 ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`} />
          </div>
          <p className={`text-4xl font-bold mt-3 ${data.currentStreak > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {data.currentStreak}
            <span className="text-lg font-medium ml-1">day{data.currentStreak === 1 ? '' : 's'}</span>
          </p>
          <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">
            {data.currentStreak > 0
              ? data.todayIsNoSpend
                ? '🔥 Keep it going today!'
                : 'Ended yesterday — start a new one!'
              : data.todayIsNoSpend
                ? 'Today counts — spend nothing to start!'
                : 'Spend nothing today to begin'}
          </p>
        </div>

        {/* Longest streak */}
        <div className="rounded-xl border p-6 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30 border-violet-200 dark:border-violet-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Longest Streak
            </p>
            <Trophy className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-4xl font-bold mt-3 text-violet-600 dark:text-violet-400">
            {data.longestStreak}
            <span className="text-lg font-medium ml-1">day{data.longestStreak === 1 ? '' : 's'}</span>
          </p>
          <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">Personal best 🏆</p>
        </div>

        {/* No-spend last 30 */}
        <div className="rounded-xl border p-6 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              No-Spend (30d)
            </p>
            <CalendarDays className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-4xl font-bold mt-3 text-emerald-600 dark:text-emerald-400">
            {data.noSpendLast30}
            <span className="text-lg font-medium ml-1">/ {Math.min(30, data.totalDaysTracked)}</span>
          </p>
          <div className="w-full bg-emerald-100 dark:bg-emerald-900/40 rounded-full h-1.5 mt-3">
            <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${noSpendRatio30}%` }} />
          </div>
        </div>

        {/* No-spend last 90 */}
        <div className="rounded-xl border p-6 shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              No-Spend (90d)
            </p>
            <TrendingDown className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-4xl font-bold mt-3 text-slate-700 dark:text-slate-200">
            {data.noSpendLast90}
            <span className="text-lg font-medium ml-1">/ {Math.min(90, data.totalDaysTracked)}</span>
          </p>
          <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">
            {data.totalDaysTracked > 0
              ? `${Math.round((data.noSpendLast90 / Math.min(90, data.totalDaysTracked)) * 100)}% of days`
              : 'No data yet'}
          </p>
        </div>
      </div>

      {/* ===== 35-day strip + Day-of-week pattern ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contribution strip */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Last 5 Weeks
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Green = no-spend day · warm colors = spending intensity. Click any day for details.
          </p>

          {/* Grid: columns = weeks, rows = Sun..Sat */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {chunkWeeks(data.recentDays).map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1.5">
                {week.map((day) =>
                  day ? (
                    <button
                      key={day.date}
                      onClick={() => openDayDialog(day)}
                      title={`${formatDateLabel(day.date)} · ${day.isNoSpend ? 'No spend' : formatIdr(day.total) + ' · ' + day.txCount + ' tx'}`}
                      className={`w-9 h-9 rounded-md transition hover:ring-2 hover:ring-offset-1 hover:ring-offset-white dark:hover:ring-offset-slate-800 hover:ring-slate-400 ${
                        day.isNoSpend
                          ? 'bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-600'
                          : spendIntensity(day.total)
                      }`}
                    />
                  ) : (
                    <div key={`empty-${wi}-${Math.random()}`} className="w-9 h-9" />
                  )
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600 inline-block" /> No spend
            </span>
            <span>Less</span>
            <span className="w-3 h-3 rounded-sm bg-amber-200 dark:bg-amber-900/50 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-amber-300 dark:bg-amber-800/60 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-orange-300 dark:bg-orange-800/70 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-orange-400 dark:bg-orange-700/80 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-600/90 inline-block" />
            <span>More</span>
          </div>
        </div>

        {/* Day-of-week pattern */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-1">Spending by Weekday</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Last 90 days</p>
          <div className="space-y-2.5">
            {data.dowPattern.map((d) => {
              const total = d.spendDays + d.noSpendDays;
              const spendPct = total > 0 ? Math.round((d.spendDays / total) * 100) : 0;
              const maxAvg = Math.max(...data.dowPattern.map((x) => x.avgPerSpendDay), 1);
              const intensityPct = Math.round((d.avgPerSpendDay / maxAvg) * 100);
              return (
                <div key={d.dow}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{d.label}</span>
                    <span className="text-slate-400">
                      {d.spendDays} spend · <span className="text-emerald-600 dark:text-emerald-400">{d.noSpendDays} no-spend</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${intensityPct > 75 ? 'bg-red-400 dark:bg-red-500' : intensityPct > 50 ? 'bg-orange-400 dark:bg-orange-500' : 'bg-amber-400 dark:bg-amber-500'}`}
                        style={{ width: `${spendPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 w-16 text-right">
                      {d.avgPerSpendDay > 0 ? formatIdr(d.avgPerSpendDay) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {heaviestWeekday && heaviestWeekday.avgPerSpendDay > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-red-500">⚠ {heaviestWeekday.label}s</span> are your heaviest
                spending days (avg {formatIdr(heaviestWeekday.avgPerSpendDay)}).
                {bestWeekday && bestWeekday.label !== heaviestWeekday.label && (
                  <> You're most disciplined on <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bestWeekday.label}s</span>.</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== Badges ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Badges
          </h2>
          <Badge variant="secondary">
            {data.badges.filter((b) => b.unlocked).length} / {data.badges.length} unlocked
          </Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Earn badges by building no-spend streaks. Progress bars show how close you are.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.badges.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl border p-4 transition ${
                b.unlocked
                  ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-3xl ${b.unlocked ? '' : 'grayscale opacity-50'}`}>{b.icon}</span>
                {b.unlocked && <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">Earned</span>}
              </div>
              <p className={`font-semibold text-sm ${b.unlocked ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {b.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{b.description}</p>
              {!b.unlocked && b.progress && (
                <div className="mt-2">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 transition-all" style={{ width: `${Math.min(100, (b.progress.current / b.progress.target) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{b.progress.current} / {b.progress.target}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Recent no-spend days list ===== */}
      {data.recentNoSpendDays.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-emerald-500" /> Recent No-Spend Days
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Last 30 days · {data.recentNoSpendDays.length} no-spend day{data.recentNoSpendDays.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.recentNoSpendDays.map((d) => {
              const dt = new Date(d + 'T00:00:00');
              return (
                <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {DOW_SHORT[dt.getDay()]}, {MONTH_SHORT[dt.getMonth()]} {dt.getDate()}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Explanation footer ===== */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex gap-3">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong>How it works:</strong> A <em>no-spend day</em> is any calendar day with zero
          discretionary spending (cash or credit-card purchases). Credit-card
          <em> payments</em> don't count — they're just moving money between accounts, not real spending.
          Streaks reset the moment you make a purchase. Tracking started
          {data.firstTrackedDate ? ` ${new Date(data.firstTrackedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ' recently'}
          {data.totalDaysTracked > 0 && ` · ${data.totalDaysTracked} days tracked`}.
        </p>
      </div>

      {/* ===== Day detail dialog ===== */}
      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDay?.isNoSpend ? (
                <><span className="text-emerald-500">🎉</span> No-Spend Day</>
              ) : (
                <><span>💸</span> Spending Day</>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedDay && formatDateLabel(selectedDay.date)}
              {selectedDay && !selectedDay.isNoSpend && (
                <> · {formatIdr(selectedDay.total)} across {selectedDay.txCount} transaction{selectedDay.txCount === 1 ? '' : 's'}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDay?.isNoSpend ? (
            <div className="py-6 text-center">
              <p className="text-3xl mb-2">🌱</p>
              <p className="font-medium text-slate-700 dark:text-slate-200">No discretionary spending!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                You kept money in your pocket all day. Every no-spend day extends your streak.
              </p>
            </div>
          ) : dialogLoading ? (
            <div className="py-8 text-center text-sm text-slate-500 animate-pulse">Loading transactions…</div>
          ) : dayTransactions && dayTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayTransactions.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.category}</TableCell>
                    <TableCell className="text-right font-medium">{formatIdr(t.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-sm text-slate-500 text-center">
              Spending detected but no individual transactions found for this date.
              (Transactions may use a different timestamp.)
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Chunk the flat recentDays array (oldest→newest) into week columns aligned to Sunday. */
function chunkWeeks(days: StreakDay[]): (StreakDay | null)[][] {
  if (days.length === 0) return [];
  const weeks: (StreakDay | null)[][] = [];
  let currentWeek: (StreakDay | null)[] = [];

  // Pad the first week so it starts on a Sunday
  const firstDow = days[0].dow; // 0=Sun
  for (let i = 0; i < firstDow; i++) currentWeek.push(null);

  for (const day of days) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  // Pad the last week
  while (currentWeek.length > 0 && currentWeek.length < 7) currentWeek.push(null);
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return weeks;
}

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Lock,
  Sparkles,
  TrendingUp,
  Target,
  Calendar,
  Wallet,
  Award,
  ChevronRight,
} from 'lucide-react';

// ── Types (mirror db.ts interfaces) ────────────────────────────────────────
interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'networth' | 'savings' | 'discipline' | 'longevity' | 'diversity';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedDate: string | null;
  progress?: { current: number; target: number; unit: string };
  value?: string;
}

interface MilestoneHighlight {
  label: string;
  value: string;
  icon: string;
  subtext?: string;
}

interface AchievementsResult {
  highlights: MilestoneHighlight[];
  badges: AchievementBadge[];
  unlockedCount: number;
  totalCount: number;
  nextMilestone: AchievementBadge | null;
  levelInfo: {
    level: number;
    title: string;
    progressToNext: number;
    pointsToNext: number;
  };
}

// ── Tier styling ───────────────────────────────────────────────────────────
const TIER_STYLES: Record<string, { ring: string; bg: string; text: string; glow: string; label: string }> = {
  bronze:   { ring: 'ring-amber-700/40',   bg: 'from-amber-700/10 to-amber-600/5',   text: 'text-amber-700 dark:text-amber-500',   glow: 'shadow-amber-700/10',   label: 'Bronze' },
  silver:   { ring: 'ring-slate-400/40',   bg: 'from-slate-400/10 to-slate-300/5',   text: 'text-slate-600 dark:text-slate-300',  glow: 'shadow-slate-400/10',   label: 'Silver' },
  gold:     { ring: 'ring-yellow-500/40',  bg: 'from-yellow-500/10 to-amber-400/5',  text: 'text-yellow-600 dark:text-yellow-400', glow: 'shadow-yellow-500/10',  label: 'Gold' },
  platinum: { ring: 'ring-cyan-400/40',    bg: 'from-cyan-400/10 to-blue-400/5',     text: 'text-cyan-600 dark:text-cyan-300',     glow: 'shadow-cyan-400/10',    label: 'Platinum' },
};

const CATEGORY_LABELS: Record<string, string> = {
  networth: 'Net Worth',
  savings: 'Savings',
  discipline: 'Discipline',
  longevity: 'Longevity',
  diversity: 'Diversity',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  networth: <Wallet className="w-3.5 h-3.5" />,
  savings: <PiggyBankIcon />,
  discipline: <ShieldIcon />,
  longevity: <Calendar className="w-3.5 h-3.5" />,
  diversity: <Sparkles className="w-3.5 h-3.5" />,
};

function PiggyBankIcon() {
  return <span className="text-xs">🐷</span>;
}
function ShieldIcon() {
  return <span className="text-xs">🛡️</span>;
}

// ── Format helper for progress values ──────────────────────────────────────
function formatProgress(current: number, target: number, unit: string): string {
  if (unit === 'IDR') {
    const fmt = (n: number) => 'IDR ' + Math.round(n).toLocaleString('id-ID');
    return `${fmt(current)} / ${fmt(target)}`;
  }
  if (unit === '%') {
    return `${current.toFixed(1)}% / ${target}%`;
  }
  return `${Math.round(current)} / ${target} ${unit}`;
}

function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

// ── Badge Card ─────────────────────────────────────────────────────────────
function BadgeCard({ badge }: { badge: AchievementBadge }) {
  const tier = TIER_STYLES[badge.tier] ?? TIER_STYLES.bronze;
  const pct = badge.progress ? progressPct(badge.progress.current, badge.progress.target) : 0;

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all hover:scale-[1.02] ${
        badge.unlocked
          ? `bg-gradient-to-br ${tier.bg} border-transparent ring-1 ${tier.ring} shadow-md ${tier.glow}`
          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100'
      }`}
    >
      {/* Tier ribbon */}
      <div className="absolute top-2 right-2">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${tier.text} bg-white/60 dark:bg-slate-900/40`}>
          {tier.label}
        </span>
      </div>

      {/* Icon */}
      <div className={`text-4xl mb-2 ${badge.unlocked ? '' : 'grayscale opacity-50'}`}>
        {badge.unlocked ? badge.icon : <span className="inline-block"><Lock className="w-7 h-7 text-slate-400" /></span>}
      </div>

      {/* Title + description */}
      <h4 className={`font-semibold text-sm mb-1 ${badge.unlocked ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
        {badge.title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-snug min-h-[2.5rem]">
        {badge.description}
      </p>

      {/* Status */}
      {badge.unlocked ? (
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Trophy className="w-3 h-3" />
          <span>{badge.value ?? 'Unlocked'}</span>
        </div>
      ) : badge.progress ? (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span>{formatProgress(badge.progress.current, badge.progress.target, badge.progress.unit)}</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: badge.tier === 'platinum' ? '#22d3ee' : badge.tier === 'gold' ? '#eab308' : badge.tier === 'silver' ? '#94a3b8' : '#b45309' }}
            />
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 italic">Locked</div>
      )}
    </div>
  );
}

// ── Highlight Card ─────────────────────────────────────────────────────────
function HighlightCard({ h }: { h: MilestoneHighlight }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1">
        <span className="text-2xl">{h.icon}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-1">{h.label}</div>
      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{h.value}</div>
      {h.subtext && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{h.subtext}</div>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
interface Props {
  data: AchievementsResult;
}

export default function Achievements({ data }: Props) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked' | AchievementBadge['category']>('all');

  const filteredBadges = useMemo(() => {
    if (filter === 'all') return data.badges;
    if (filter === 'unlocked') return data.badges.filter((b) => b.unlocked);
    if (filter === 'locked') return data.badges.filter((b) => !b.unlocked);
    return data.badges.filter((b) => b.category === filter);
  }, [data.badges, filter]);

  // Group badges by category for display
  const grouped = useMemo(() => {
    const map = new Map<string, AchievementBadge[]>();
    for (const b of filteredBadges) {
      if (!map.has(b.category)) map.set(b.category, []);
      map.get(b.category)!.push(b);
    }
    return map;
  }, [filteredBadges]);

  const categoryOrder: Array<{ key: AchievementBadge['category']; label: string; icon: React.ReactNode }> = [
    { key: 'networth', label: 'Net Worth Milestones', icon: <Wallet className="w-4 h-4" /> },
    { key: 'savings', label: 'Savings Achievements', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'longevity', label: 'Tracking Longevity', icon: <Calendar className="w-4 h-4" /> },
    { key: 'discipline', label: 'Spending Discipline', icon: <ShieldIcon /> },
    { key: 'diversity', label: 'Category Diversity', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const filterOptions: Array<{ key: typeof filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'unlocked', label: `Unlocked (${data.unlockedCount})` },
    { key: 'locked', label: `Locked (${data.totalCount - data.unlockedCount})` },
    ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ key: k as typeof filter, label: v })),
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero: Level & Rank ─────────────────────────────────────────── */}
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Level badge */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center">
                  <Award className="w-9 h-9" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
                  {data.levelInfo.level}
                </div>
              </div>
              {/* Rank text */}
              <div>
                <div className="text-xs uppercase tracking-wider text-white/70 font-medium">Achievement Level</div>
                <div className="text-3xl font-bold">{data.levelInfo.title}</div>
                <div className="text-sm text-white/80 mt-1">
                  {data.unlockedCount} of {data.totalCount} badges unlocked
                </div>
              </div>
            </div>

            {/* Completion ring */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-white/70 font-medium">Completion</div>
                <div className="text-2xl font-bold">{data.levelInfo.progressToNext}%</div>
                <div className="text-xs text-white/70">{data.levelInfo.pointsToNext} badge{data.levelInfo.pointsToNext !== 1 ? 's' : ''} to go</div>
              </div>
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.2)" strokeWidth="6" fill="none" />
                  <circle
                    cx="32" cy="32" r="28"
                    stroke="white" strokeWidth="6" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - data.levelInfo.progressToNext / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {data.unlockedCount}/{data.totalCount}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Next Milestone banner ──────────────────────────────────────── */}
      {data.nextMilestone && (
        <Card className="border-dashed border-2 border-indigo-300 dark:border-indigo-700">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="text-3xl">{data.nextMilestone.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wide">
                <Target className="w-3 h-3" />
                <span>Next Milestone</span>
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{data.nextMilestone.title}</div>
              {data.nextMilestone.progress && (
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden max-w-xs">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-700"
                      style={{ width: `${progressPct(data.nextMilestone.progress.current, data.nextMilestone.progress.target)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatProgress(data.nextMilestone.progress.current, data.nextMilestone.progress.target, data.nextMilestone.progress.unit)}
                  </span>
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
          </CardContent>
        </Card>
      )}

      {/* ── Highlight stat cards ───────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Your Financial Story
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.highlights.map((h, i) => (
            <HighlightCard key={i} h={h} />
          ))}
        </div>
      </div>

      {/* ── Filter chips ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400 mr-1">Filter:</span>
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === opt.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Badge trophy case (grouped) ────────────────────────────────── */}
      {filteredBadges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No badges in this category yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map((cat) => {
            const items = grouped.get(cat.key);
            if (!items || items.length === 0) return null;
            const unlockedInCat = items.filter((b) => b.unlocked).length;
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-slate-500 dark:text-slate-400">{cat.icon}</span>
                  <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">{cat.label}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {unlockedInCat}/{items.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

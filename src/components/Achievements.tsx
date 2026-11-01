import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Clock,
  ShieldCheck,
  Zap,
  Star,
  Activity,
  Layers,
  Info,
  X,
} from 'lucide-react';
import { formatIdr } from '../lib/utils';

// Types mirroring backend API and db.ts
export interface AchievementBadge {
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

export interface MilestoneHighlight {
  label: string;
  value: string;
  icon: string;
  subtext?: string;
}

export interface AchievementsResult {
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

// XP rewards per tier
export const TIER_XP: Record<AchievementBadge['tier'], number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
  platinum: 100,
};

// Styling tokens per tier with WCAG AA compliance in both light and dark modes
export const TIER_STYLES: Record<
  AchievementBadge['tier'],
  {
    ring: string;
    bg: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
    label: string;
    border: string;
    progressBar: string;
  }
> = {
  bronze: {
    ring: 'ring-amber-700/40 dark:ring-amber-600/50',
    bg: 'from-amber-700/10 to-amber-600/5 dark:from-amber-950/30 dark:to-amber-900/10',
    text: 'text-amber-800 dark:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60',
    badgeText: 'text-amber-900 dark:text-amber-300',
    glow: 'shadow-amber-900/10',
    label: 'Bronze',
    border: 'border-amber-300 dark:border-amber-800/50',
    progressBar: 'bg-amber-600 dark:bg-amber-500',
  },
  silver: {
    ring: 'ring-slate-400/40 dark:ring-slate-400/40',
    bg: 'from-slate-200/50 to-slate-100/30 dark:from-slate-800/40 dark:to-slate-900/20',
    text: 'text-slate-800 dark:text-slate-200',
    badgeBg: 'bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700',
    badgeText: 'text-slate-800 dark:text-slate-200',
    glow: 'shadow-slate-400/10',
    label: 'Silver',
    border: 'border-slate-300 dark:border-slate-700',
    progressBar: 'bg-slate-500 dark:bg-slate-400',
  },
  gold: {
    ring: 'ring-amber-500/40 dark:ring-amber-400/40',
    bg: 'from-amber-400/15 to-yellow-300/10 dark:from-amber-950/40 dark:to-yellow-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80 border border-amber-400/60 dark:border-amber-700',
    badgeText: 'text-amber-900 dark:text-amber-200',
    glow: 'shadow-amber-500/15',
    label: 'Gold',
    border: 'border-amber-400/50 dark:border-amber-700/60',
    progressBar: 'bg-amber-500 dark:bg-amber-400',
  },
  platinum: {
    ring: 'ring-cyan-400/40 dark:ring-cyan-400/40',
    bg: 'from-cyan-400/15 to-teal-300/10 dark:from-cyan-950/40 dark:to-teal-900/20',
    text: 'text-cyan-800 dark:text-cyan-300',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-700',
    badgeText: 'text-cyan-900 dark:text-cyan-200',
    glow: 'shadow-cyan-400/15',
    label: 'Platinum',
    border: 'border-cyan-300 dark:border-cyan-700',
    progressBar: 'bg-cyan-500 dark:bg-cyan-400',
  },
};

export const CATEGORY_LABELS: Record<AchievementBadge['category'], string> = {
  networth: 'Net Worth',
  savings: 'Tabungan',
  discipline: 'Disiplin Belanja',
  longevity: 'Durasi Tracking',
  diversity: 'Diversitas Kategori',
};

export const CATEGORY_ICONS: Record<AchievementBadge['category'], React.ReactNode> = {
  networth: <Wallet className="w-3.5 h-3.5" />,
  savings: <TrendingUp className="w-3.5 h-3.5" />,
  discipline: <ShieldCheck className="w-3.5 h-3.5" />,
  longevity: <Calendar className="w-3.5 h-3.5" />,
  diversity: <Sparkles className="w-3.5 h-3.5" />,
};

// 10 Milestone Ranks with required XP
export const LEVEL_RANKS = [
  { level: 1, title: 'Pemula Finansial', minXp: 0, icon: '🌱' },
  { level: 2, title: 'Pencatat Aktif', minXp: 30, icon: '📝' },
  { level: 3, title: 'Penabung Disiplin', minXp: 80, icon: '💡' },
  { level: 4, title: 'Pengatur Anggaran', minXp: 160, icon: '🎯' },
  { level: 5, title: 'Pembangun Aset', minXp: 260, icon: '🧱' },
  { level: 6, title: 'Investor Tangguh', minXp: 400, icon: '🚀' },
  { level: 7, title: 'Ahli Ketahanan', minXp: 580, icon: '🛡️' },
  { level: 8, title: 'Ahli Strategi Finansial', minXp: 800, icon: '⚡' },
  { level: 9, title: 'Master Keuangan', minXp: 1100, icon: '👑' },
  { level: 10, title: 'Legenda Finansial', minXp: 1500, icon: '🏆' },
];

function formatProgress(current: number, target: number, unit: string): string {
  if (unit === 'IDR') {
    return `${formatIdr(current)} / ${formatIdr(target)}`;
  }
  if (unit === '%') {
    return `${current.toFixed(1)}% / ${target}%`;
  }
  if (unit === 'periods') {
    return `${current} / ${target} periode`;
  }
  if (unit === 'days') {
    return `${current} / ${target} hari`;
  }
  if (unit === 'categories') {
    return `${current} / ${target} kategori`;
  }
  return `${Math.round(current)} / ${target} ${unit}`;
}

function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

function formatUnlockDate(isoDate: string | null): string {
  if (!isoDate) return '-';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

interface Props {
  initialData?: AchievementsResult;
}

export default function Achievements({ initialData }: Props) {
  // CRITICAL: Call all hooks top-level unconditionally before any returns
  const [data, setData] = useState<AchievementsResult | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Active view navigation
  const [activeTab, setActiveTab] = useState<'trophy' | 'timeline' | 'journey'>('trophy');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AchievementBadge['category']>('all');
  const [tierFilter, setTierFilter] = useState<'all' | AchievementBadge['tier']>('all');

  // Interactive detail modal state
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);

  // Load from REST endpoint if no initialData
  useEffect(() => {
    if (initialData) return;

    let cancelled = false;
    setLoading(true);

    fetch('/api/achievements')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: AchievementsResult) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Gagal memuat data pencapaian');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialData]);

  // Total XP & Rank calculation
  const xpStats = useMemo(() => {
    const badges = data?.badges ?? [];
    let currentXp = 0;
    let totalPossibleXp = 0;

    for (const b of badges) {
      const xpVal = TIER_XP[b.tier] || 10;
      totalPossibleXp += xpVal;
      if (b.unlocked) {
        currentXp += xpVal;
      }
    }

    // Determine current level rank
    let currentRank = LEVEL_RANKS[0];
    let nextRank: (typeof LEVEL_RANKS)[0] | null = LEVEL_RANKS[1];

    for (let i = 0; i < LEVEL_RANKS.length; i++) {
      if (currentXp >= LEVEL_RANKS[i].minXp) {
        currentRank = LEVEL_RANKS[i];
        nextRank = i + 1 < LEVEL_RANKS.length ? LEVEL_RANKS[i + 1] : null;
      }
    }

    const xpToNext = nextRank ? Math.max(0, nextRank.minXp - currentXp) : 0;
    const rankProgressPct = nextRank
      ? Math.min(
          100,
          Math.max(
            0,
            ((currentXp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp)) * 100
          )
        )
      : 100;

    return {
      currentXp,
      totalPossibleXp,
      currentRank,
      nextRank,
      xpToNext,
      rankProgressPct,
    };
  }, [data?.badges]);

  // Filtered badges for Trophy Case
  const filteredBadges = useMemo(() => {
    const list = data?.badges ?? [];
    return list.filter((b) => {
      if (statusFilter === 'unlocked' && !b.unlocked) return false;
      if (statusFilter === 'locked' && b.unlocked) return false;
      if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
      if (tierFilter !== 'all' && b.tier !== tierFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = b.title.toLowerCase().includes(q);
        const descMatch = b.description.toLowerCase().includes(q);
        const catMatch = CATEGORY_LABELS[b.category]?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [data?.badges, statusFilter, categoryFilter, tierFilter, searchQuery]);

  // Grouped badges by category
  const groupedBadges = useMemo(() => {
    const map = new Map<AchievementBadge['category'], AchievementBadge[]>();
    for (const b of filteredBadges) {
      if (!map.has(b.category)) {
        map.set(b.category, []);
      }
      map.get(b.category)!.push(b);
    }
    return map;
  }, [filteredBadges]);

  // Chronological timeline of unlocked badges
  const unlockedTimeline = useMemo(() => {
    const list = (data?.badges ?? []).filter((b) => b.unlocked);
    return [...list].sort((a, b) => {
      const dateA = a.unlockedDate ? new Date(a.unlockedDate).getTime() : 0;
      const dateB = b.unlockedDate ? new Date(b.unlockedDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [data?.badges]);

  const handleOpenBadgeDetail = useCallback((badge: AchievementBadge) => {
    setSelectedBadge(badge);
  }, []);

  // Early returns AFTER all hooks
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-white/[0.08] rounded-lg" />
          <div className="h-28 w-full bg-slate-200 dark:bg-white/[0.08] rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-white/[0.08] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-6 border border-rose-300 dark:border-rose-900/50 rounded-xl space-y-3">
        <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
          <Info className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{error || 'Gagal memuat data pencapaian'}</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-white/60">
          Terjadi kesalahan saat menghubungi server. Silakan muat ulang halaman atau coba lagi.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="text-xs"
        >
          Muat Ulang Halaman
        </Button>
      </div>
    );
  }

  const categoryOrder: Array<{ key: AchievementBadge['category']; label: string; icon: React.ReactNode }> = [
    { key: 'networth', label: 'Net Worth Milestones', icon: <Wallet className="w-4 h-4" /> },
    { key: 'savings', label: 'Tabungan & Akumulasi', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'longevity', label: 'Durasi Tracking', icon: <Calendar className="w-4 h-4" /> },
    { key: 'discipline', label: 'Disiplin Belanja', icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'diversity', label: 'Diversitas Kategori', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ── SECTION 1: Master Gamification Hero & XP Hub ───────────────── */}
      <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-slate-200 dark:border-white/[0.08]">
          {/* Level & Rank Badge */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-mint-500/20 to-cyan-500/20 border-2 border-mint-500/40 dark:border-mint-400/50 flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
                {xpStats.currentRank.icon}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 bg-mint-500 text-slate-900 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-md border-2 border-white dark:border-slate-900">
                Lv.{xpStats.currentRank.level}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-mint-600 dark:text-mint-400">
                  Tingkat Prestasi Finansial
                </span>
                <Badge
                  variant="outline"
                  className="text-[11px] font-bold border-mint-500/40 text-mint-700 dark:text-mint-300 bg-mint-500/10"
                >
                  {data.levelInfo.title}
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {xpStats.currentRank.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60 mt-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  <strong>{data.unlockedCount}</strong> dari {data.totalCount} lencana terbuka
                </span>
                <span className="text-slate-400 dark:text-white/30">•</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span>
                  <strong>{xpStats.currentXp} XP</strong> terkumpul
                </span>
              </div>
            </div>
          </div>

          {/* XP Progress Bar to Next Rank */}
          <div className="w-full lg:max-w-xs space-y-2 bg-slate-50 dark:bg-white/[0.03] p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-white/70">
                Peringkat Berikutnya:
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {xpStats.nextRank ? xpStats.nextRank.title : 'Peringkat Tertinggi'}
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-white/[0.1] rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-mint-500 to-cyan-500 rounded-full transition-all duration-700"
                style={{ width: `${xpStats.rankProgressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-white/50">
              <span>{xpStats.currentXp} XP</span>
              {xpStats.nextRank ? (
                <span>Kurang {xpStats.xpToNext} XP ke Lv.{xpStats.nextRank.level}</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Maksimal</span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic View Selector Tabs */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('trophy')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'trophy'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Koleksi Lencana ({data.unlockedCount}/{data.totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'timeline'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-mint-500" />
              <span>Linimasa Milestone ({unlockedTimeline.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('journey')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'journey'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-cyan-500" />
              <span>Peringkat & XP Matrix</span>
            </button>
          </div>

          {/* Quick status pill */}
          <div className="text-xs text-slate-600 dark:text-white/50 hidden sm:block">
            Tingkat Kelengkapan: <strong>{data.levelInfo.progressToNext}%</strong>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Next Milestone Spotlight ───────────────────────── */}
      {data.nextMilestone && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenBadgeDetail(data.nextMilestone!)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenBadgeDetail(data.nextMilestone!);
            }
          }}
          className="glass-card p-4 sm:p-5 border-2 border-dashed border-mint-500/40 hover:border-mint-500 transition-all cursor-pointer rounded-xl group"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="text-3xl sm:text-4xl shrink-0 p-2 rounded-xl bg-mint-500/10 border border-mint-500/20 group-hover:scale-105 transition-transform">
                {data.nextMilestone.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mint-600 dark:text-mint-400">
                  <Target className="w-3.5 h-3.5" />
                  <span>Target Terdekat Berikutnya</span>
                  <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 border-mint-500/30">
                    +{TIER_XP[data.nextMilestone.tier]} XP
                  </Badge>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                  {data.nextMilestone.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/60 truncate">
                  {data.nextMilestone.description}
                </p>

                {data.nextMilestone.progress && (
                  <div className="mt-2 flex items-center gap-3 max-w-md">
                    <div className="flex-1 bg-slate-200 dark:bg-white/[0.08] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-mint-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${progressPct(
                            data.nextMilestone.progress.current,
                            data.nextMilestone.progress.target
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-700 dark:text-white/70 whitespace-nowrap">
                      {formatProgress(
                        data.nextMilestone.progress.current,
                        data.nextMilestone.progress.target,
                        data.nextMilestone.progress.unit
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-mint-600 dark:text-mint-400 shrink-0">
              <span className="hidden sm:inline">Lihat Detail</span>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-mint-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Highlights Grid ─────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-white/50 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Statistik Rekor Finansial Anda</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.highlights.map((h, i) => (
            <div
              key={i}
              className="glass-card p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.15] transition-all"
            >
              <div className="text-2xl mb-1.5">{h.icon}</div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide truncate">
                {h.label}
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {h.value}
              </div>
              {h.subtext && (
                <div className="text-[10px] text-slate-600 dark:text-white/50 truncate mt-1">
                  {h.subtext}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 4: Tab Content ─────────────────────────────────────── */}
      {/* TAB 1: TROPHY CASE */}
      {activeTab === 'trophy' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Cari lencana atau kriteria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-lg"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  Semua ({data.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unlocked')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    statusFilter === 'unlocked'
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-bold'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Terbuka ({data.unlockedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('locked')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    statusFilter === 'locked'
                      ? 'bg-slate-700 text-white dark:bg-slate-600'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Terkunci ({data.totalCount - data.unlockedCount})</span>
                </button>
              </div>
            </div>

            {/* Category & Tier filters */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-white/40 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                <span>Kategori:</span>
              </span>

              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                  categoryFilter === 'all'
                    ? 'bg-mint-500 text-slate-900 font-bold'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                }`}
              >
                Semua Kategori
              </button>

              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCategoryFilter(k as any)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                    categoryFilter === k
                      ? 'bg-mint-500 text-slate-900 font-bold'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  {CATEGORY_ICONS[k as AchievementBadge['category']]}
                  <span>{v}</span>
                </button>
              ))}

              <div className="ml-auto flex items-center gap-1 text-xs">
                <span className="text-slate-500 dark:text-white/40 mr-1">Tier:</span>
                {(['all', 'bronze', 'silver', 'gold', 'platinum'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTierFilter(t)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase transition ${
                      tierFilter === t
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grouped Badges Grid */}
          {filteredBadges.length === 0 ? (
            <div className="glass-card p-8 text-center rounded-xl border border-slate-200 dark:border-white/[0.08] space-y-2">
              <Trophy className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
              <div className="text-sm font-semibold text-slate-700 dark:text-white/70">
                Tidak ada lencana yang sesuai kriteria pencarian
              </div>
              <p className="text-xs text-slate-500 dark:text-white/50 max-w-sm mx-auto">
                Coba sesuaikan kata kunci pencarian atau reset filter untuk melihat semua lencana.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setTierFilter('all');
                }}
                className="text-xs mt-2"
              >
                Reset Semua Filter
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {categoryOrder.map((cat) => {
                const items = groupedBadges.get(cat.key);
                if (!items || items.length === 0) return null;
                const unlockedInCat = items.filter((b) => b.unlocked).length;

                return (
                  <div key={cat.key} className="space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-white/70">
                          {cat.icon}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {cat.label}
                        </h4>
                      </div>

                      <Badge variant="outline" className="text-xs font-semibold">
                        {unlockedInCat} / {items.length} Terbuka
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                      {items.map((badge) => {
                        const tier = TIER_STYLES[badge.tier];
                        const pct = badge.progress
                          ? progressPct(badge.progress.current, badge.progress.target)
                          : 0;

                        return (
                          <div
                            key={badge.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleOpenBadgeDetail(badge)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleOpenBadgeDetail(badge);
                              }
                            }}
                            className={`relative rounded-xl border p-4 transition-all text-left cursor-pointer group hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-mint-500 ${
                              badge.unlocked
                                ? `bg-gradient-to-br ${tier.bg} ${tier.border} shadow-sm ${tier.glow}`
                                : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] opacity-85 hover:opacity-100'
                            }`}
                          >
                            {/* Tier Badge Ribbon */}
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tier.badgeBg} ${tier.badgeText}`}
                              >
                                {tier.label}
                              </span>

                              <span className="text-[11px] font-bold text-slate-500 dark:text-white/40">
                                +{TIER_XP[badge.tier]} XP
                              </span>
                            </div>

                            {/* Icon */}
                            <div className="flex items-center justify-between mb-2">
                              <div
                                className={`text-3xl ${
                                  badge.unlocked ? '' : 'grayscale opacity-60'
                                } group-hover:scale-110 transition-transform`}
                              >
                                {badge.unlocked ? (
                                  badge.icon
                                ) : (
                                  <Lock className="w-6 h-6 text-slate-400 dark:text-white/40" />
                                )}
                              </div>

                              {badge.unlocked && (
                                <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>

                            {/* Title & Description */}
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 group-hover:text-mint-600 dark:group-hover:text-mint-400 transition-colors">
                              {badge.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-white/60 mb-3 leading-snug line-clamp-2 min-h-[32px]">
                              {badge.description}
                            </p>

                            {/* Status Footer */}
                            {badge.unlocked ? (
                              <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.05] flex items-center justify-between text-xs">
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                                  {badge.value ?? 'Tercapai'}
                                </span>
                                {badge.unlockedDate && (
                                  <span className="text-[10px] text-slate-500 dark:text-white/40 shrink-0">
                                    {formatUnlockDate(badge.unlockedDate)}
                                  </span>
                                )}
                              </div>
                            ) : badge.progress ? (
                              <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-white/[0.05]">
                                <div className="flex justify-between text-[11px] text-slate-600 dark:text-white/50 font-mono">
                                  <span>{pct.toFixed(0)}%</span>
                                  <span>
                                    {badge.progress.unit === 'IDR'
                                      ? `${formatIdr(badge.progress.current)}`
                                      : `${Math.round(badge.progress.current)} / ${badge.progress.target}`}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${tier.progressBar}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-white/40 italic flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>Belum terbuka</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MILESTONE TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-mint-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Linimasa Kronologis Pencapaian
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/50">
                  Jejak rekam tonggak finansial yang telah Anda raih sejak awal pencatatan.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-xs font-semibold border-mint-500/30 text-mint-700 dark:text-mint-300">
              {unlockedTimeline.length} Tonggak Tercapai
            </Badge>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
            {unlockedTimeline.map((badge, idx) => {
              const tier = TIER_STYLES[badge.tier];

              return (
                <div key={badge.id} className="relative group">
                  {/* Timeline Node */}
                  <div className="absolute -left-6 sm:-left-8 top-1 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-mint-500 flex items-center justify-center text-xs shadow-sm">
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-mint-500" />
                  </div>

                  {/* Card Content */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenBadgeDetail(badge)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenBadgeDetail(badge);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-mint-500 text-left ${tier.bg} ${tier.border}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{badge.icon}</span>
                        <div>
                          <h4 className="font-bold text-base text-slate-900 dark:text-white">
                            {badge.title}
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50">
                            {CATEGORY_LABELS[badge.category]} • Tier {tier.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tier.badgeBg} ${tier.badgeText}`}
                        >
                          +{TIER_XP[badge.tier]} XP
                        </span>
                        {badge.unlockedDate && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {formatUnlockDate(badge.unlockedDate)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-white/70 leading-relaxed">
                      {badge.description}
                    </p>

                    {badge.value && (
                      <div className="mt-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-md px-2.5 py-1 inline-block">
                        {badge.value}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LEVEL JOURNEY & XP MATRIX */}
      {activeTab === 'journey' && (
        <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/[0.08] rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-cyan-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tangga Peringkat Finansial & Matriks XP
                </h3>
                <p className="text-xs text-slate-600 dark:text-white/50">
                  Panduan tingkatan level dan sumber akumulasi poin prestasi finansial.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-xs font-bold border-cyan-500/40 text-cyan-700 dark:text-cyan-300">
              Total {xpStats.currentXp} XP Terkumpul
            </Badge>
          </div>

          {/* XP Breakdown by Tier */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['bronze', 'silver', 'gold', 'platinum'] as const).map((t) => {
              const tier = TIER_STYLES[t];
              const count = data.badges.filter((b) => b.tier === t && b.unlocked).length;
              const totalTier = data.badges.filter((b) => b.tier === t).length;
              const xpVal = TIER_XP[t];

              return (
                <div
                  key={t}
                  className={`p-3.5 rounded-xl border ${tier.border} ${tier.bg} text-center space-y-1`}
                >
                  <span className={`text-xs font-bold uppercase ${tier.text}`}>
                    Tier {tier.label}
                  </span>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {count * xpVal} XP
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-white/50">
                    {count}/{totalTier} lencana ({xpVal} XP/lencana)
                  </div>
                </div>
              );
            })}
          </div>

          {/* 10 Level Progression Pathway */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
              Tahapan 10 Peringkat Kebebasan Finansial
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LEVEL_RANKS.map((rank) => {
                const isCurrent = xpStats.currentRank.level === rank.level;
                const isUnlocked = xpStats.currentXp >= rank.minXp;

                return (
                  <div
                    key={rank.level}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'border-mint-500 bg-mint-500/10 ring-1 ring-mint-500 shadow-sm'
                        : isUnlocked
                        ? 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02]'
                        : 'border-slate-200 dark:border-white/[0.04] bg-slate-100/50 dark:bg-white/[0.01] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl p-2 rounded-lg bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-white/[0.06]">
                        {rank.icon}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500 dark:text-white/50">
                            Level {rank.level}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-mint-500 text-slate-900 text-[10px] font-extrabold py-0 h-4">
                              Saat Ini
                            </Badge>
                          )}
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {rank.title}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800 dark:text-white/90">
                        {rank.minXp} XP
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-white/40">
                        {isUnlocked ? 'Tercapai' : `Kurang ${rank.minXp - xpStats.currentXp} XP`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 5: Interactive Badge Detail Modal ──────────────────── */}
      {selectedBadge && (
        <Dialog open={!!selectedBadge} onOpenChange={(open) => !open && setSelectedBadge(null)}>
          <DialogContent className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-xl">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    TIER_STYLES[selectedBadge.tier].badgeBg
                  } ${TIER_STYLES[selectedBadge.tier].badgeText}`}
                >
                  Tier {TIER_STYLES[selectedBadge.tier].label}
                </span>

                <div className="flex items-center gap-1 text-xs font-bold text-mint-600 dark:text-mint-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+{TIER_XP[selectedBadge.tier]} XP Reward</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="text-4xl p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] shrink-0">
                  {selectedBadge.icon}
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {selectedBadge.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                    Kategori: {CATEGORY_LABELS[selectedBadge.category]}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-700 dark:text-white/80 leading-relaxed">
                {selectedBadge.description}
              </div>

              {/* Status Section */}
              {selectedBadge.unlocked ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Lencana Telah Berhasil Dibuka</span>
                  </div>
                  {selectedBadge.value && (
                    <div className="text-xs text-slate-700 dark:text-white/80 font-medium">
                      Rekor: <strong>{selectedBadge.value}</strong>
                    </div>
                  )}
                  {selectedBadge.unlockedDate && (
                    <div className="text-[11px] text-slate-500 dark:text-white/50">
                      Pertama kali tercapai pada: {formatUnlockDate(selectedBadge.unlockedDate)}
                    </div>
                  )}
                </div>
              ) : selectedBadge.progress ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-white/70">
                      Status Progres:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {progressPct(selectedBadge.progress.current, selectedBadge.progress.target).toFixed(0)}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-white/[0.1] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        TIER_STYLES[selectedBadge.tier].progressBar
                      }`}
                      style={{
                        width: `${progressPct(
                          selectedBadge.progress.current,
                          selectedBadge.progress.target
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-600 dark:text-white/60 font-mono">
                    <span>Saat ini: {selectedBadge.progress.unit === 'IDR' ? formatIdr(selectedBadge.progress.current) : selectedBadge.progress.current}</span>
                    <span>Target: {selectedBadge.progress.unit === 'IDR' ? formatIdr(selectedBadge.progress.target) : selectedBadge.progress.target}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Kekurangan untuk membuka lencana: {' '}
                    {selectedBadge.progress.unit === 'IDR'
                      ? formatIdr(Math.max(0, selectedBadge.progress.target - selectedBadge.progress.current))
                      : `${Math.max(0, selectedBadge.progress.target - selectedBadge.progress.current)} ${selectedBadge.progress.unit}`}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-600 dark:text-white/60 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Lencana ini masih terkunci. Terus catat transaksi dan tabungan Anda untuk membukanya.
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedBadge(null)}
                  className="text-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

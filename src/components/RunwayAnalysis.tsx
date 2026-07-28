import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import Sparkline from './Sparkline';
import { formatIdr } from '../lib/utils';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Droplet,
  Wallet,
  CalendarClock,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

interface AssetBreakdown {
  name: string;
  value: number;
  liquidityPct: number;
  liquidValue: number;
}

interface RunwayHistoryPoint {
  period_id: number;
  month: string;
  liquid_assets: number;
  total_assets: number;
  runway_months: number;
}

interface RunwayData {
  liquid_assets: number;
  total_assets: number;
  illiquid_assets: number;
  monthly_expense: number;
  monthly_fixed: number;
  runway_months: number;
  fixed_coverage_months: number;
  status: 'critical' | 'caution' | 'healthy' | 'strong';
  target_months: number;
  asset_breakdown: AssetBreakdown[];
  history: RunwayHistoryPoint[];
  period_id: number | null;
  month: string | null;
  tips: string[];
}

const STATUS_CONFIG: Record<RunwayData['status'], {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  gaugeColor: string;
  icon: React.ReactNode;
}> = {
  critical: {
    label: 'Kritis',
    color: '#ef4444',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-700 dark:text-red-300',
    gaugeColor: '#ef4444',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  caution: {
    label: 'Hati-hati',
    color: '#f59e0b',
    bgColor: 'bg-gold-500/5 dark:bg-gold-700/10',
    borderColor: 'border-gold-400/20 dark:border-gold-700/40',
    textColor: 'text-gold-700 dark:text-gold-300',
    gaugeColor: '#f59e0b',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  healthy: {
    label: 'Sehat',
    color: '#10b981',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    gaugeColor: '#10b981',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  strong: {
    label: 'Sangat Sehat',
    color: '#06b6d4',
    bgColor: 'bg-mint-500/5 dark:bg-mint-700/10/30',
    borderColor: 'border-mint-200 dark:border-mint-800',
    textColor: 'text-mint-600 dark:text-mint-300',
    gaugeColor: '#06b6d4',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
};

/** SVG gauge showing runway months against a 0-12 scale. */
function RunwayGauge({ months, target, color }: { months: number; target: number; color: string }) {
  const max = 12;
  const pct = Math.min(months / max, 1);
  const radius = 80;
  const stroke = 14;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - pct * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        {/* Background track */}
        <circle
          stroke="#e2e8f0"
          strokeOpacity="0.4"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Filled arc */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white/80">
          {months.toFixed(1)}
        </span>
        <span className="text-xs text-white/50 mt-0.5">bulan</span>
      </div>
    </div>
  );
}

/** Progress bar showing liquid vs illiquid split. */
function LiquidityBar({ breakdown }: { breakdown: AssetBreakdown[] }) {
  const total = breakdown.reduce((s, b) => s + b.value, 0);
  if (total === 0) return null;

  // Sort by liquidity desc for visual grouping
  const sorted = [...breakdown].sort((a, b) => b.liquidityPct - a.liquidityPct);

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.05]">
        {sorted.map((b, i) => {
          const widthPct = (b.value / total) * 100;
          const hue = b.liquidityPct >= 0.9 ? 'bg-emerald-400'
            : b.liquidityPct >= 0.5 ? 'bg-gold-400'
            : 'bg-slate-400';
          return (
            <div
              key={i}
              className={hue}
              style={{ width: `${widthPct}%` }}
              title={`${b.name}: ${formatIdr(b.value)} (${Math.round(b.liquidityPct * 100)}% likuid)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
        {sorted.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                b.liquidityPct >= 0.9 ? 'bg-emerald-400'
                  : b.liquidityPct >= 0.5 ? 'bg-gold-400'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-white/60">{b.name}</span>
            <span className="text-white/40">·</span>
            <span className="font-medium text-white/70">{Math.round(b.liquidityPct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  /** Optional period ID. If omitted, uses the latest networth period. */
  periodId?: number;
  /** Compact mode — hide tips and history sparkline. */
  compact?: boolean;
}

export default function RunwayAnalysis({ periodId, compact = false }: Props) {
  const [data, setData] = useState<RunwayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const url = periodId
      ? `/api/runway?period_id=${periodId}`
      : '/api/runway';
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch runway data');
        return r.json();
      })
      .then((d: RunwayData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [periodId]);

  const config = useMemo(() => data ? STATUS_CONFIG[data.status] : STATUS_CONFIG.critical, [data]);
  const trendSparkData = useMemo(() => {
    if (!data || data.history.length === 0) return [] as number[];
    return data.history.map(h => h.runway_months);
  }, [data]);

  if (loading) {
    return (
      <div className="glass-card p-5 border-white/[0.06] shadow-none">
        
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-32 bg-white/[0.08] rounded" />
            <div className="h-40 w-40 mx-auto bg-white/[0.08] rounded-full" />
          </div>
        
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-5 border-white/[0.06] shadow-none">
        
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Gagal memuat data runway. Coba lagi nanti.</span>
          </div>
        
      </div>
    );
  }

  // No data available
  if (data.total_assets === 0) {
    return (
      <div className="glass-card p-5 border-white/[0.06] shadow-none">
        
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Droplet className="w-4 h-4" />
            <span>Belum ada data networth. Tambahkan data networth untuk menghitung runway.</span>
          </div>
        
      </div>
    );
  }

  return (
    <div className={`glass-card p-5 border ${config.borderColor} shadow-none`}>
      
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${config.bgColor} ${config.textColor}`}>
              {config.icon}
            </div>
            <div>
              <h3 className="text-base text-white/80">Emergency Fund Runway</h3>
              <p className="text-xs text-white/50">
                {data.month ? `Periode ${data.month}` : 'Periode terbaru'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`${config.textColor} ${config.borderColor}`}>
            {config.label}
          </Badge>
        </div>
      
      
        {/* Gauge + key stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="flex justify-center">
            <RunwayGauge months={data.runway_months} target={data.target_months} color={config.gaugeColor} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Droplet className="w-4 h-4 text-mint-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-white/50 text-xs">Aset Likuid</div>
                <div className="font-semibold text-white/80">{formatIdr(data.liquid_assets)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-coral-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-white/50 text-xs">Total Aset</div>
                <div className="font-semibold text-white/80">{formatIdr(data.total_assets)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="w-4 h-4 text-gold-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-white/50 text-xs">Pengeluaran/Bulan (rata-rata 3 bln)</div>
                <div className="font-semibold text-white/80">{formatIdr(data.monthly_expense)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-white/50 text-xs">Cakupan Biaya Tetap</div>
                <div className="font-semibold text-white/80">{data.fixed_coverage_months.toFixed(1)} bulan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Liquidity breakdown bar */}
        {data.asset_breakdown.length > 0 && (
          <div>
            <div className="text-xs text-white/50 mb-2">Likuiditas Aset</div>
            <LiquidityBar breakdown={data.asset_breakdown} />
          </div>
        )}

        {/* History sparkline */}
        {!compact && trendSparkData.length >= 2 && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/50">Tren Runway</div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-white/40" />
                <span className="text-xs text-white/40">{data.history.length} bulan terakhir</span>
              </div>
            </div>
            <Sparkline data={trendSparkData} width={120} height={36} color={config.gaugeColor} />
          </div>
        )}

        {/* Tips */}
        {!compact && data.tips.length > 0 && (
          <div className={`rounded-lg ${config.bgColor} p-3 space-y-1.5`}>
            <div className="flex items-center gap-1.5">
              <Lightbulb className={`w-3.5 h-3.5 ${config.textColor}`} />
              <span className={`text-xs font-medium ${config.textColor}`}>Rekomendasi</span>
            </div>
            {data.tips.map((tip, i) => (
              <p key={i} className="text-xs text-white/60 leading-relaxed">{tip}</p>
            ))}
          </div>
        )}

        {/* Link to detail page */}
        {compact && (
          <a
            href="/runway"
            className="flex items-center justify-center gap-1 text-xs text-mint-500 hover:text-mint-600 dark:text-mint-400"
          >
            <span>Lihat detail</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        )}
      
    </div>
  );
}

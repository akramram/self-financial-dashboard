import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Scale, BarChart3 } from 'lucide-react';

interface ChipData {
  label: string;
  value: string;
  delta: string;
  deltaPct: string;
  isPositive: boolean;
  color: string;
  icon: React.ReactNode;
  sparkline: number[];
}

// Dummy data — replace with real data in production
const DUMMY_CHIPS: ChipData[] = [
  {
    label: 'Income',
    value: 'Rp 15,000,000',
    delta: '+1,500,000',
    deltaPct: '+11.1%',
    isPositive: true,
    color: '#00d4aa',
    icon: <DollarSign className="w-4 h-4" />,
    sparkline: [13.2, 13.8, 14.1, 13.5, 14.8, 15.0],
  },
  {
    label: 'Spent',
    value: 'Rp 10,800,000',
    delta: '-800,000',
    deltaPct: '-6.9%',
    isPositive: true, // lower spending is good
    color: '#ff6b6b',
    icon: <Wallet className="w-4 h-4" />,
    sparkline: [11.5, 12.1, 10.8, 11.2, 10.5, 10.8],
  },
  {
    label: 'Net Worth',
    value: 'Rp 31,500,000',
    delta: '+3,200,000',
    deltaPct: '+11.3%',
    isPositive: true,
    color: '#ffd700',
    icon: <BarChart3 className="w-4 h-4" />,
    sparkline: [24.1, 26.5, 28.3, 29.1, 30.2, 31.5],
  },
];

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const h = 28;
  const w = 64;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      {/* endpoint dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
    </svg>
  );
}

function ChipCard({ data }: { data: ChipData }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setAnimated(true); }, []);

  return (
    <div
      className={`
        relative p-4 rounded-2xl transition-all duration-500 cursor-pointer
        hover:scale-[1.02] hover:shadow-lg group
        ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.06)`,
        backdropFilter: 'blur(10px)',
        transitionDelay: '0ms',
      }}
    >
      {/* Subtle glass highlight on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at top left, ${data.color}10, transparent 60%)`,
        }} />

      <div className="relative flex items-start justify-between">
        <div>
          {/* Icon + label */}
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: data.color }}>{data.icon}</span>
            <p className="text-xs font-medium text-white/40">{data.label}</p>
          </div>

          {/* Value */}
          <p className="text-lg font-bold text-white mb-1.5 tabular-nums">{data.value}</p>

          {/* Delta */}
          <div className="flex items-center gap-1" style={{ color: data.isPositive ? data.color : data.color }}>
            {data.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="text-xs font-semibold">{data.delta}</span>
            <span className="text-[10px] opacity-50">{data.deltaPct}</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="mt-1">
          <MiniSparkline data={data.sparkline} color={data.color} />
        </div>
      </div>
    </div>
  );
}

export function BalanceHero() {
  const balanceStr = 'Rp 4,200,000';
  const deltaStr = '+12%';

  return (
    <div className="relative p-6 rounded-2xl overflow-hidden transition-all hover:scale-[1.005]"
      style={{
        background: 'linear-gradient(135deg, rgba(0,212,170,0.15) 0%, rgba(14,165,233,0.1) 40%, rgba(0,212,170,0.05) 100%)',
        border: '1px solid rgba(0,212,170,0.12)',
        backdropFilter: 'blur(20px)',
      }}>
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,170,0.3), transparent 70%)',
          transform: 'translate(30%, -30%)',
        }} />

      <div className="relative">
        {/* Label */}
        <p className="text-sm font-medium text-white/40 mb-1">Available Balance</p>

        {/* Big number */}
        <p className="text-4xl font-bold text-white tabular-nums tracking-tight">{balanceStr}</p>

        {/* Delta pill + period info */}
        <div className="flex items-center gap-3 mt-3">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: '#00d4aa' }}>
            <TrendingUp className="w-3 h-3" />
            {deltaStr}
          </span>
          <span className="text-xs text-white/20">vs last period</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardGlanceCardsPrototype() {
  return (
    <div className="space-y-4" style={{ backgroundColor: '#0a0e27', minHeight: '100vh', padding: '24px' }}>
      <p className="text-xs text-white/30 uppercase tracking-wider mb-4">Section 1 — PULSE</p>

      {/* Balance Hero */}
      <BalanceHero />

      {/* Glance Chips — 3 cols desktop, scrollable mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DUMMY_CHIPS.map((chip) => (
          <ChipCard key={chip.label} data={chip} />
        ))}
      </div>
    </div>
  );
}

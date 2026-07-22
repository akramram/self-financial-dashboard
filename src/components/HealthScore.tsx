import React, { useState, useEffect, useMemo } from 'react';
import type { MonthlySummary, Category } from '../lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  PiggyBank,
  Target,
  Wallet,
  Activity,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Trophy,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HealthFactor {
  name: string;
  score: number;
  maxScore: number;
  label: string;
  detail: string;
  icon: string;
}

interface HealthData {
  overall: number;
  grade: string;
  gradeColor: string;
  factors: HealthFactor[];
  month: string;
  prevScore: number | null;
  trend: 'up' | 'down' | 'stable' | 'new';
  tips: string[];
  history: { month: string; score: number }[];
}

interface Props {
  summaries: MonthlySummary[];
  categories: Category[];
}

function ScoreGauge({ score, grade, gradeColor }: { score: number; grade: string; gradeColor: string }) {
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const colorMap: Record<string, string> = {
    emerald: '#10b981',
    green: '#22c55e',
    yellow: '#eab308',
    amber: '#f59e0b',
    orange: '#f97316',
    red: '#ef4444',
  };
  const mainColor = colorMap[gradeColor] || '#6b7280';
  const bgColor = gradeColor === 'emerald' || gradeColor === 'green'
    ? 'bg-emerald-50 dark:bg-emerald-950/30'
    : gradeColor === 'yellow' || gradeColor === 'amber'
      ? 'bg-amber-50 dark:bg-amber-950/30'
      : gradeColor === 'orange'
        ? 'bg-orange-50 dark:bg-orange-950/30'
        : 'bg-red-50 dark:bg-red-950/30';

  const textColor = gradeColor === 'emerald' || gradeColor === 'green'
    ? 'text-emerald-700 dark:text-emerald-300'
    : gradeColor === 'yellow' || gradeColor === 'amber'
      ? 'text-amber-700 dark:text-amber-300'
      : gradeColor === 'orange'
        ? 'text-orange-700 dark:text-orange-300'
        : 'text-red-700 dark:text-red-300';

  const badgeBg = gradeColor === 'emerald' || gradeColor === 'green'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
    : gradeColor === 'yellow' || gradeColor === 'amber'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
      : gradeColor === 'orange'
        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-2xl ${bgColor} border border-white/[0.06]`}>
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
          {/* Background circle */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            className="text-white/15"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke={mainColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-in-out' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className={`text-4xl font-bold ${textColor}`}>{score}</span>
          <span className="text-xs text-white/50">/ 100</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Badge className={`${badgeBg} text-lg px-3 py-1`}>{grade}</Badge>
      </div>
      <p className="mt-2 text-sm text-white/60">Financial Health Score</p>
    </div>
  );
}

function FactorIcon({ icon, score, maxScore }: { icon: string; score: number; maxScore: number }) {
  const pct = (score / maxScore) * 100;
  const color = pct >= 80
    ? 'text-emerald-500'
    : pct >= 60
      ? 'text-amber-500'
      : pct >= 40
        ? 'text-orange-500'
        : 'text-red-500';

  const iconMap: Record<string, React.ReactNode> = {
    'piggy-bank': <PiggyBank className={color} />,
    'target': <Target className={color} />,
    'trending-up': <TrendingUp className={color} />,
    'wallet': <Wallet className={color} />,
    'activity': <Activity className={color} />,
  };

  return <>{iconMap[icon] || <Heart className={color} />}</>;
}

function FactorCard({ factor }: { factor: HealthFactor }) {
  const pct = (factor.score / factor.maxScore) * 100;
  const barColor = pct >= 80
    ? 'bg-emerald-500'
    : pct >= 60
      ? 'bg-amber-500'
      : pct >= 40
        ? 'bg-orange-500'
        : 'bg-red-500';

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FactorIcon icon={factor.icon} score={factor.score} maxScore={factor.maxScore} />
          <span className="font-medium text-sm text-white/70">{factor.name}</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-white/80">{factor.score}</span>
          <span className="text-xs text-white/40">/{factor.maxScore}</span>
        </div>
      </div>
      <div className="w-full bg-white/[0.05] rounded-full h-2 mb-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/50">{factor.label}</span>
      </div>
      <p className="text-xs text-white/50 mt-1">{factor.detail}</p>
    </div>
  );
}

export default function HealthScore({ summaries, categories }: Props) {
  const months = useMemo(() => [...summaries].reverse().map((s) => s.month), [summaries]);
  const [selectedMonth, setSelectedMonth] = useState<string>(months[0] || 'all');
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = selectedMonth !== 'all' ? `?month=${encodeURIComponent(selectedMonth)}` : '';
    fetch(`/api/health${params}`)
      .then((res) => res.json())
      .then((data: HealthData) => setHealthData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  const trendChart = useMemo(() => {
    if (!healthData?.history) return null;
    return {
      labels: healthData.history.map((h) => h.month),
      datasets: [
        {
          label: 'Health Score',
          data: healthData.history.map((h) => h.score),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: healthData.history.map((h) => h.score >= 80
            ? '#10b981'
            : h.score >= 50
              ? '#f59e0b'
              : '#ef4444'),
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [healthData]);

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `Score: ${ctx.parsed.y}/100`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: {
          callback: (value: any) => `${value}`,
          font: { size: 11 },
          color: '#94a3b8',
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          color: '#94a3b8',
          maxRotation: 45,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        <span className="ml-3 text-white/50">Calculating health score...</span>
      </div>
    );
  }

  if (!healthData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-white/30 mb-4" />
          <p className="text-white/50">Not enough data to calculate health score.</p>
          <p className="text-sm text-white/40 mt-1">Add transactions and income data to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white/60">Period:</label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Latest Month</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-white/40 ml-2">
          {healthData.month}
        </span>
      </div>

      {/* Score Gauge + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Gauge */}
        <div className="lg:col-span-1">
          <ScoreGauge
            score={healthData.overall}
            grade={healthData.grade}
            gradeColor={healthData.gradeColor}
          />
          {/* Trend indicator */}
          {healthData.trend !== 'new' && healthData.prevScore !== null && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {healthData.trend === 'up' ? (
                <>
                  <ArrowUpRight className="text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    +{healthData.overall - healthData.prevScore} pts from last month
                  </span>
                </>
              ) : healthData.trend === 'down' ? (
                <>
                  <ArrowDownRight className="text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {healthData.overall - healthData.prevScore} pts from last month
                  </span>
                </>
              ) : (
                <>
                  <Minus className="text-white/50" />
                  <span className="text-sm font-medium text-white/60">
                    No change from last month
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* History Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-white/70">Score History</h3>
          </div>
          <div className="h-[220px]">
            {trendChart && healthData.history.length > 1 ? (
              <Line data={trendChart} options={trendOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-white/40 text-sm">
                Need at least 2 months of data for trend chart
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Factor Breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-white/70">Factor Breakdown</h3>
          <span className="text-xs text-white/40">Each factor contributes 0-20 points</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthData.factors.map((factor) => (
            <FactorCard key={factor.name} factor={factor} />
          ))}
        </div>
      </div>

      {/* Improvement Tips */}
      {healthData.tips.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-indigo-500" />
              Improvement Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {healthData.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How is the score calculated?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/60">
            <div>
              <h4 className="font-medium text-white/70 mb-1">🎯 Savings Rate (0-20)</h4>
              <p>Higher savings rates = better score. 30%+ savings earns full points.</p>
            </div>
            <div>
              <h4 className="font-medium text-white/70 mb-1">🎯 Budget Adherence (0-20)</h4>
              <p>Based on how many categories stay within their monthly limits.</p>
            </div>
            <div>
              <h4 className="font-medium text-white/70 mb-1">📈 Networth Growth (0-20)</h4>
              <p>Measures month-over-month networth change. 5%+ growth = full points.</p>
            </div>
            <div>
              <h4 className="font-medium text-white/70 mb-1">💰 Spending Control (0-20)</h4>
              <p>Reward for spending well below income. Under 50% = full points.</p>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-medium text-white/70 mb-1">🔄 Consistency (0-20)</h4>
              <p>Measures stability of savings rate over 3 months. Low variance = high score.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

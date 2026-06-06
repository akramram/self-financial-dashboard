import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatIdr } from '../lib/utils';
import {
  Flame,
  Target,
  Clock,
  TrendingUp,
  PiggyBank,
  Wallet,
  ArrowUpRight,
  Info,
  Sliders,
  HelpCircle,
} from 'lucide-react';

interface FireData {
  monthlyExpenses: number;
  annualExpenses: number;
  monthlyIncome: number;
  monthlySavings: number;
  currentNetworth: number;
  savingsRate: number;
  fireNumber: number;
  progressPct: number;
  yearsToFi: number | null;
  projectedFiDate: string | null;
  monthlyContributionNeeded: number;
  projection: Array<{
    year: number;
    date: string;
    balance: number;
    contributions: number;
    returns: number;
  }>;
  params: {
    withdrawalRate: number;
    expectedReturn: number;
    inflation: number;
  };
}

export default function FireCalculator() {
  const [data, setData] = useState<FireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Adjustable parameters (stored as percentages for display)
  const [wr, setWr] = useState(4);
  const [er, setEr] = useState(7);
  const [inf, setInf] = useState(3);
  const [showHelp, setShowHelp] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/fire?wr=${wr}&er=${er}&inf=${inf}`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Failed to load FIRE data');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, [wr, er, inf]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 dark:border-slate-300" />
        <span className="ml-3 text-slate-500">Crunching the numbers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <CardContent className="pt-6 text-center">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const {
    monthlyExpenses,
    annualExpenses,
    monthlyIncome,
    monthlySavings,
    currentNetworth,
    savingsRate,
    fireNumber,
    progressPct,
    yearsToFi,
    projectedFiDate,
    monthlyContributionNeeded,
    projection,
    params,
  } = data;

  const isFi = currentNetworth >= fireNumber;
  const hasSavings = monthlySavings > 0;
  const isNegativeSavings = monthlySavings < 0;

  // Chart dimensions
  const chartHeight = 200;
  const maxBalance = projection.length > 0
    ? Math.max(fireNumber, projection[projection.length - 1].balance)
    : fireNumber;
  const fiThresholdY = fireNumber / maxBalance;

  const formatYears = (y: number | null): string => {
    if (y === null) return 'N/A';
    if (y === 0) return 'Now';
    if (y < 1) return `${Math.round(y * 12)} months`;
    return `${y.toFixed(1)} years`;
  };

  return (
    <div className="space-y-6">
      {/* Assumptions Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-slate-500" />
              <CardTitle className="text-lg">Adjust Assumptions</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs"
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              {showHelp ? 'Hide Help' : 'What do these mean?'}
            </Button>
          </div>
          {showHelp && (
            <CardDescription className="pt-2 space-y-1 text-xs">
              <p><strong>Withdrawal Rate:</strong> The % of your portfolio you withdraw annually in retirement. The "4% Rule" is standard.</p>
              <p><strong>Expected Return:</strong> Your assumed annual investment return (after fees). Historical S&P 500: ~7% after inflation.</p>
              <p><strong>Inflation:</strong> How much prices rise each year. Affects your purchasing power and real returns.</p>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">
                Withdrawal Rate: <span className="font-semibold text-slate-700 dark:text-slate-300">{wr}%</span>
              </Label>
              <input
                type="range"
                min={2}
                max={8}
                step={0.5}
                value={wr}
                onChange={(e) => setWr(parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>2% (conservative)</span>
                <span>8% (aggressive)</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">
                Expected Return: <span className="font-semibold text-slate-700 dark:text-slate-300">{er}%</span>
              </Label>
              <input
                type="range"
                min={2}
                max={14}
                step={0.5}
                value={er}
                onChange={(e) => setEr(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>2% (bonds)</span>
                <span>14% (aggressive)</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">
                Inflation: <span className="font-semibold text-slate-700 dark:text-slate-300">{inf}%</span>
              </Label>
              <input
                type="range"
                min={0}
                max={8}
                step={0.5}
                value={inf}
                onChange={(e) => setInf(parseFloat(e.target.value))}
                className="w-full accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0%</span>
                <span>8% (high)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FIRE Number */}
        <Card className={isFi ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className={`w-4 h-4 ${isFi ? 'text-emerald-500' : 'text-slate-500'}`} />
              <span className="text-xs font-medium text-slate-500">FIRE Number</span>
            </div>
            <p className="text-2xl font-bold">{formatIdr(fireNumber)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {Math.round(params.withdrawalRate * 100)}% rule: {Math.round(1 / params.withdrawalRate)}× annual expenses
            </p>
          </CardContent>
        </Card>

        {/* Current Networth */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-500">Current Networth</span>
            </div>
            <p className="text-2xl font-bold">{formatIdr(currentNetworth)}</p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{progressPct}% of FIRE target</p>
          </CardContent>
        </Card>

        {/* Years to FI */}
        <Card className={isFi ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`w-4 h-4 ${isFi ? 'text-emerald-500' : 'text-slate-500'}`} />
              <span className="text-xs font-medium text-slate-500">Time to FI</span>
            </div>
            <p className={`text-2xl font-bold ${isFi ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              {formatYears(yearsToFi)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {projectedFiDate || '—'}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Savings */}
        <Card className={isNegativeSavings ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className={`w-4 h-4 ${isNegativeSavings ? 'text-red-500' : 'text-emerald-500'}`} />
              <span className="text-xs font-medium text-slate-500">Monthly Savings</span>
            </div>
            <p className={`text-2xl font-bold ${isNegativeSavings ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatIdr(monthlySavings)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Savings rate: {savingsRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Journey to FI Chart */}
      {projection.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-500" />
              <CardTitle className="text-lg">Journey to Financial Independence</CardTitle>
            </div>
            <CardDescription>
              Projected networth growth with your current savings rate and assumptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative" style={{ height: chartHeight + 60 }}>
              {/* Chart area */}
              <div className="relative" style={{ height: chartHeight }}>
                {/* FI Threshold line */}
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-emerald-400/60 z-10"
                  style={{ bottom: `${fiThresholdY * 100}%` }}
                >
                  <span className="absolute right-0 -top-3 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    FI Target
                  </span>
                </div>

                {/* Bars for each year */}
                <div className="absolute inset-0 flex items-end gap-px">
                  {projection.map((p, i) => {
                    const barHeight = (p.balance / maxBalance) * 100;
                    const isPastFi = p.balance >= fireNumber;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col justify-end group relative"
                        style={{ height: '100%' }}
                      >
                        <div
                          className={`w-full rounded-t transition-all ${
                            isPastFi
                              ? 'bg-emerald-500/80 dark:bg-emerald-400/80'
                              : 'bg-blue-500/60 dark:bg-blue-400/60'
                          }`}
                          style={{ height: `${barHeight}%` }}
                        />
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                          <div className="bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                            <p className="font-semibold">{p.date}</p>
                            <p>Balance: {formatIdr(p.balance)}</p>
                            <p>Contrib: {formatIdr(p.contributions)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-axis labels */}
              <div className="flex gap-px mt-1">
                {projection.map((p, i) => {
                  // Show label every ~5 years or at start/end/FI
                  const showLabel = i === 0 || i === projection.length - 1 || 
                    (p.balance >= fireNumber && projection[i - 1]?.balance < fireNumber) ||
                    i % 5 === 0;
                  return (
                    <div key={i} className="flex-1 text-center">
                      {showLabel && (
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {p.year === 0 ? 'Now' : `Y${p.year}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500/60" />
                <span>Accumulation phase</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/80" />
                <span>Financially Independent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0 border-t-2 border-dashed border-emerald-400" />
                <span>FIRE Target</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-500" />
              Monthly Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Income</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatIdr(monthlyIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Expenses</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {formatIdr(monthlyExpenses)}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
                <span className="text-sm font-medium">Monthly Savings</span>
                <span className={`text-sm font-bold ${monthlySavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatIdr(monthlySavings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Savings Rate</span>
                <span className={`text-sm font-semibold ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  {savingsRate}%
                  {savingsRate >= 50 && <Badge className="ml-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">Super Saver</Badge>}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FIRE Math */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500" />
              The Math Behind Your Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Annual Expenses</span>
                <span className="font-semibold">{formatIdr(annualExpenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Withdrawal Rate</span>
                <span className="font-semibold">{params.withdrawalRate * 100}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Multiplier (1 ÷ WR)</span>
                <span className="font-semibold">{Math.round(1 / params.withdrawalRate)}×</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
                <span className="font-medium">FIRE Number</span>
                <span className="font-bold text-lg">{formatIdr(fireNumber)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Real Return (after inflation)</span>
                <span className="font-mono">{(((1 + params.expectedReturn) / (1 + params.inflation) - 1) * 100).toFixed(2)}%</span>
              </div>
              {!isFi && monthlyContributionNeeded > 0 && monthlySavings <= 0 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    To reach FI in 10 years, you'd need to save {formatIdr(monthlyContributionNeeded)} per month.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      {!isFi && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Flame className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-2">Ways to reach FI faster:</h3>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                  {savingsRate < 50 && (
                    <li>Increase your savings rate from {savingsRate}% to 50%+ for dramatic acceleration</li>
                  )}
                  {monthlyExpenses > 0 && (
                    <li>Reducing monthly expenses by 10% ({formatIdr(Math.round(monthlyExpenses * 0.1))}) lowers your FIRE number by {formatIdr(Math.round(fireNumber * 0.1))}</li>
                  )}
                  <li>Invest in low-cost index funds to maximize your expected return</li>
                  <li>Consider side income streams to boost your monthly savings</li>
                  <li>Track your progress monthly — consistency beats timing the market</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isFi && (
        <Card className="border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10">
          <CardContent className="pt-6 text-center">
            <Flame className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              🎉 Congratulations — You're Financially Independent!
            </h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              Your networth of {formatIdr(currentNetworth)} exceeds your FIRE number of {formatIdr(fireNumber)}.
              Your portfolio can sustain {formatIdr(annualExpenses)}/year at {params.withdrawalRate * 100}% withdrawal.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

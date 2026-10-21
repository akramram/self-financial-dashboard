import React, { useState, useMemo } from 'react';
import type { Transaction } from '../lib/data';
import { formatIdr, periodForDate } from '../lib/utils';
import { getSubsequentPeriodMonth, calculateInstallment } from '../lib/installment';
import { convertToInstallmentApi } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, AlertCircle, Check, Percent, Receipt, Calendar } from 'lucide-react';

interface Props {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

const MONTH_PRESETS = [3, 6, 12, 24];
const INTEREST_PRESETS = [
  { label: '0% Promo', value: 0 },
  { label: '0.75%', value: 0.75 },
  { label: '1.25%', value: 1.25 },
  { label: '1.5%', value: 1.5 },
];

export default function ConvertToInstallmentModal({ open, transaction, onClose, onSuccess }: Props) {
  if (!transaction) return null;

  // Initial date derived from transaction's created_time or date
  const defaultDate = useMemo(() => {
    if (transaction.created_time) {
      return transaction.created_time.slice(0, 10);
    }
    if (transaction.date) {
      return transaction.date.slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  }, [transaction]);

  const [months, setMonths] = useState<number>(6);
  const [interestType, setInterestType] = useState<'percent' | 'nominal'>('percent');
  const [interestPercent, setInterestPercent] = useState<string>('0');
  const [interestNominal, setInterestNominal] = useState<string>('0');
  const [adminFee, setAdminFee] = useState<string>('0');
  const [startDate, setStartDate] = useState<string>(defaultDate);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Period analysis
  const periodInfo = useMemo(() => {
    const p = periodForDate(startDate);
    if (!p) return null;
    const startPeriod = `${p.month} ${p.year}`;
    const safeMonths = Math.max(2, months || 2);
    const endPeriod = getSubsequentPeriodMonth(startPeriod, safeMonths - 1);
    return { startPeriod, endPeriod };
  }, [startDate, months]);

  // Real-time calculation
  const calc = useMemo(() => {
    const pct = interestType === 'percent' ? parseFloat(interestPercent) || 0 : undefined;
    const flat = interestType === 'nominal' ? parseFloat(interestNominal) || 0 : undefined;
    const fee = parseFloat(adminFee) || 0;

    return calculateInstallment({
      amount: transaction.amount,
      months,
      interestPercent: pct,
      interestFlatMonthly: flat,
      adminFee: fee,
    });
  }, [transaction.amount, months, interestType, interestPercent, interestNominal, adminFee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodInfo) {
      setError('Tanggal mulai tidak valid.');
      return;
    }
    if (months < 2) {
      setError('Durasi cicilan minimal 2 bulan.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        months,
        interest_percent: interestType === 'percent' ? (parseFloat(interestPercent) || 0) : undefined,
        interest_flat_monthly: interestType === 'nominal' ? (parseFloat(interestNominal) || 0) : undefined,
        admin_fee: parseFloat(adminFee) || 0,
        start_date: startDate,
      };

      const res = await convertToInstallmentApi(transaction.id, payload);
      if (!res.success) {
        setError(res.error || 'Gagal mengubah transaksi menjadi cicilan.');
        setLoading(false);
        return;
      }

      onSuccess(res.result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
        <DialogHeader className="p-5 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Ubah Jadi Cicilan</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-white/50">
                Konversi pengeluaran menjadi cicilan bulanan & recurring otomatis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Transaction Summary Preview */}
        <div className="bg-slate-50 dark:bg-white/[0.03] px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-slate-800 dark:text-white/90 text-sm truncate max-w-[260px]">
              {transaction.title}
            </div>
            <div className="text-slate-500 dark:text-white/50 mt-0.5">
              {transaction.category} · {transaction.payment_method}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-white/50">Total Pokok</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
              {formatIdr(transaction.amount)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Durasi Cicilan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="months-input" className="text-xs font-semibold text-slate-700 dark:text-white/80">
                Durasi Cicilan (Bulan)
              </Label>
              <span className="text-[11px] text-slate-500 dark:text-white/50">
                {months} bulan
              </span>
            </div>
            <div className="flex gap-1.5 mb-2">
              {MONTH_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    months === m
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  {m} bln
                </button>
              ))}
            </div>
            <Input
              id="months-input"
              type="number"
              min={2}
              max={60}
              value={months}
              onChange={(e) => setMonths(Math.max(2, parseInt(e.target.value) || 2))}
              className="h-9 text-sm"
              required
            />
          </div>

          {/* Bunga Cicilan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-white/80">
                Bunga Cicilan
              </Label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInterestType('percent')}
                  className={`px-2 py-0.5 rounded ${interestType === 'percent' ? 'bg-blue-500 text-white font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                >
                  % / Bulan
                </button>
                <button
                  type="button"
                  onClick={() => setInterestType('nominal')}
                  className={`px-2 py-0.5 rounded ${interestType === 'nominal' ? 'bg-blue-500 text-white font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                >
                  Rp / Bulan
                </button>
              </div>
            </div>

            {interestType === 'percent' ? (
              <>
                <div className="flex gap-1.5 mb-1.5">
                  {INTEREST_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setInterestPercent(String(p.value))}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                        parseFloat(interestPercent) === p.value
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Contoh: 1.25"
                    value={interestPercent}
                    onChange={(e) => setInterestPercent(e.target.value)}
                    className="h-9 pr-8 text-sm"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">%</span>
                </div>
              </>
            ) : (
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-medium">Rp</span>
                <Input
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="Contoh: 25000"
                  value={interestNominal}
                  onChange={(e) => setInterestNominal(e.target.value)}
                  className="h-9 pl-9 text-sm"
                />
              </div>
            )}
          </div>

          {/* Biaya Administrasi */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="admin-fee-input" className="text-xs font-semibold text-slate-700 dark:text-white/80">
                Biaya Administrasi
              </Label>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                Item transaksi terpisah
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-medium">Rp</span>
              <Input
                id="admin-fee-input"
                type="number"
                step="1000"
                min="0"
                placeholder="0 jika tanpa biaya admin"
                value={adminFee}
                onChange={(e) => setAdminFee(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              Jika diisi, akan otomatis dibuatkan 1 item transaksi terpisah pada periode mulai cicilan.
            </p>
          </div>

          {/* Tanggal Mulai / Backdate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="start-date-input" className="text-xs font-semibold text-slate-700 dark:text-white/80">
                Tanggal Mulai Cicilan (Backdate)
              </Label>
              {periodInfo && (
                <span className="text-[11px] text-slate-500 dark:text-white/50">
                  {periodInfo.startPeriod}
                </span>
              )}
            </div>
            <Input
              id="start-date-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-sm"
              required
            />
            {periodInfo && (
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-[11px] space-y-1 text-slate-600 dark:text-white/70">
                <div className="flex items-center justify-between">
                  <span>Periode Cicilan:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {periodInfo.startPeriod} → {periodInfo.endPeriod}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-white/40">
                  *Siklus gaji: tanggal 21 s/d 20 bulan berikutnya.
                </div>
              </div>
            )}
          </div>

          {/* Live Calculation Preview Card */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-3.5 space-y-2 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Rincian Pembayaran Cicilan
            </div>
            <div className="space-y-1 pt-1 border-t border-blue-500/10">
              <div className="flex justify-between text-slate-600 dark:text-white/70">
                <span>Pokok / bulan</span>
                <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                  {formatIdr(calc.monthlyPrincipal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-white/70">
                <span>Bunga / bulan</span>
                <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                  {calc.monthlyInterest > 0 ? `+${formatIdr(calc.monthlyInterest)}` : 'Rp 0'}
                </span>
              </div>
              {calc.adminFee > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Biaya admin (1x transaksi terpisah)</span>
                  <span className="font-medium tabular-nums">
                    {formatIdr(calc.adminFee)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1.5 border-t border-blue-500/20">
                <span>Cicilan per Bulan</span>
                <span className="text-blue-600 dark:text-blue-400 tabular-nums">
                  {formatIdr(calc.monthlyAmount)} / bln
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-white/40 pt-0.5">
                <span>Total dibayar ({months} bulan)</span>
                <span className="tabular-nums">{formatIdr(calc.totalPaid)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
              className="h-10 text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 shadow-sm"
            >
              {loading ? 'Memproses...' : 'Konfirmasi Jadi Cicilan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

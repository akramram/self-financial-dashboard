/**
 * Sinking Funds & Dedicated Cash Reserves Intelligence Engine
 * 
 * Modul kalkulasi pos dana khusus dan alokasi tabungan berjangka:
 * - Menghitung sisa siklus gaji (21 - 20) menuju tenggat waktu
 * - Menghitung kebutuhan setoran bulanan (monthly required allocation)
 * - Menilai status pacing (Tercapai, Sesuai Target, Perlu Perhatian, Lewat Tenggat)
 * - Simulasi Waterfall Allocation berdasarkan prioritas (Tier 1 Wajib, Tier 2 Aman, Tier 3 Gaya Hidup)
 */

export type SinkingFundCategory = 'obligation' | 'safety' | 'lifestyle' | 'custom';
export type SinkingFundPriority = 'high' | 'medium' | 'low';
export type SinkingFundStatus = 'funded' | 'on_track' | 'needs_attention' | 'overdue';

export interface SinkingFund {
  id: string;
  name: string;
  category: SinkingFundCategory;
  priority: SinkingFundPriority;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD atau YYYY-MM
  icon?: string;
  notes?: string;
}

export interface FundPacing {
  fundId: string;
  status: SinkingFundStatus;
  progressPct: number;
  remainingAmount: number;
  cyclesRemaining: number;
  monthlyRequired: number;
  isOverdue: boolean;
}

export interface SinkingFundsSummary {
  totalTarget: number;
  totalSaved: number;
  overallProgressPct: number;
  totalMonthlyRequired: number;
  fundedCount: number;
  activeCount: number;
  highPriorityMonthlyRequired: number;
  capacityCoveragePct?: number;
}

export interface WaterfallAllocationItem {
  fundId: string;
  fundName: string;
  priority: SinkingFundPriority;
  targetAmount: number;
  currentAmount: number;
  monthlyRequired: number;
  allocatedAmount: number;
  newBalance: number;
  newProgressPct: number;
  isFullyFunded: boolean;
}

export interface WaterfallSimulationResult {
  surplusAmount: number;
  totalAllocated: number;
  unallocatedSurplus: number;
  allocations: WaterfallAllocationItem[];
}

/**
 * Hitung jumlah siklus gaji (gajian tanggal 21 s/d 20 bulan berikutnya)
 * yang tersisa dari tanggal acuan hingga tanggal target.
 */
export function calculateCyclesRemaining(targetDateStr: string, referenceDate: Date = new Date()): number {
  if (!targetDateStr) return 1;

  // Normalisasi string target: YYYY-MM-DD atau YYYY-MM
  const parts = targetDateStr.split('-').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return 1;
  }

  const targetYear = parts[0];
  const targetMonth = parts[1] - 1; // 0-indexed
  const targetDay = parts.length >= 3 && !isNaN(parts[2]) ? parts[2] : 20;

  // Evaluasi siklus acuan saat ini
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  // Jika tanggal acuan > 20, periode aktif saat ini berakhir pada tanggal 20 bulan depan
  let currentCycleEndYear = refYear;
  let currentCycleEndMonth = refMonth;
  if (refDay > 20) {
    currentCycleEndMonth += 1;
    if (currentCycleEndMonth > 11) {
      currentCycleEndMonth = 0;
      currentCycleEndYear += 1;
    }
  }

  // Tentukan siklus target: jika targetDay < 20, maka jatuh tempo di siklus sebelumnya
  let targetCycleEndYear = targetYear;
  let targetCycleEndMonth = targetMonth;
  if (targetDay < 20) {
    // Jatuh sebelum penutupan siklus bulan ini
    targetCycleEndMonth -= 1;
    if (targetCycleEndMonth < 0) {
      targetCycleEndMonth = 11;
      targetCycleEndYear -= 1;
    }
  }

  const monthDiff = (targetCycleEndYear - currentCycleEndYear) * 12 + (targetCycleEndMonth - currentCycleEndMonth);

  // Jika sudah lewat tenggat
  if (monthDiff < 0) {
    return 0;
  }

  // Siklus saat ini dihitung sebagai 1 siklus
  return monthDiff + 1;
}

/**
 * Hitung kebutuhan setoran tabungan per siklus bulanan untuk suatu pos dana
 */
export function calculateMonthlyRequired(fund: SinkingFund, referenceDate: Date = new Date()): number {
  const remaining = Math.max(0, fund.targetAmount - fund.currentAmount);
  if (remaining <= 0) return 0;

  const cycles = calculateCyclesRemaining(fund.targetDate, referenceDate);
  if (cycles <= 0) {
    return remaining; // Jika sudah lewat tenggat, butuh bayar penuh segera
  }

  return Math.ceil(remaining / cycles);
}

/**
 * Evaluasi status pacing kesehatan pos dana
 */
export function evaluateFundPacing(fund: SinkingFund, referenceDate: Date = new Date()): FundPacing {
  const remainingAmount = Math.max(0, fund.targetAmount - fund.currentAmount);
  const progressPct = fund.targetAmount > 0 
    ? Math.min(100, Number(((fund.currentAmount / fund.targetAmount) * 100).toFixed(1)))
    : 100;

  const cyclesRemaining = calculateCyclesRemaining(fund.targetDate, referenceDate);
  const isOverdue = cyclesRemaining === 0 && remainingAmount > 0;
  const monthlyRequired = calculateMonthlyRequired(fund, referenceDate);

  let status: SinkingFundStatus = 'on_track';
  if (remainingAmount === 0) {
    status = 'funded';
  } else if (isOverdue) {
    status = 'overdue';
  } else {
    // Evaluasi laju tabungan: jika progres < 40% tapi siklus sisa <= 2, pos butuh perhatian ekstra
    if (progressPct < 50 && cyclesRemaining <= 2) {
      status = 'needs_attention';
    } else {
      status = 'on_track';
    }
  }

  return {
    fundId: fund.id,
    status,
    progressPct,
    remainingAmount,
    cyclesRemaining,
    monthlyRequired,
    isOverdue,
  };
}

/**
 * Hitung ringkasan keseluruhan dari daftar pos dana
 */
export function calculateSinkingFundsSummary(
  funds: SinkingFund[],
  monthlySavingsCapacity?: number,
  referenceDate: Date = new Date()
): SinkingFundsSummary {
  let totalTarget = 0;
  let totalSaved = 0;
  let totalMonthlyRequired = 0;
  let highPriorityMonthlyRequired = 0;
  let fundedCount = 0;
  let activeCount = 0;

  for (const fund of funds) {
    totalTarget += fund.targetAmount;
    totalSaved += fund.currentAmount;

    const pacing = evaluateFundPacing(fund, referenceDate);
    if (pacing.status === 'funded') {
      fundedCount += 1;
    } else {
      activeCount += 1;
      totalMonthlyRequired += pacing.monthlyRequired;
      if (fund.priority === 'high') {
        highPriorityMonthlyRequired += pacing.monthlyRequired;
      }
    }
  }

  const overallProgressPct = totalTarget > 0
    ? Math.min(100, Number(((totalSaved / totalTarget) * 100).toFixed(1)))
    : 0;

  let capacityCoveragePct: number | undefined;
  if (monthlySavingsCapacity !== undefined && monthlySavingsCapacity > 0) {
    capacityCoveragePct = totalMonthlyRequired > 0
      ? Number(((monthlySavingsCapacity / totalMonthlyRequired) * 100).toFixed(1))
      : 100;
  }

  return {
    totalTarget,
    totalSaved,
    overallProgressPct,
    totalMonthlyRequired,
    fundedCount,
    activeCount,
    highPriorityMonthlyRequired,
    capacityCoveragePct,
  };
}

/**
 * Simulasi Waterfall Alokasi Tabungan
 * Mendistribusikan surplus kas bulanan ke pos dana berurutan dari prioritas tertinggi:
 * Tier 1 (High/Wajib) -> Tier 2 (Medium/Safety) -> Tier 3 (Low/Lifestyle).
 * Jika ada kelebihan surplus setelah semua kuota bulanan terpenuhi, sisa dana
 * dialokasikan proporsional untuk mempercepat pos yang belum lunas.
 */
export function simulateWaterfallAllocation(
  funds: SinkingFund[],
  surplusAmount: number,
  referenceDate: Date = new Date()
): WaterfallSimulationResult {
  const priorityWeight: Record<SinkingFundPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  // Filter pos yang belum lunas
  const pacings = new Map<string, FundPacing>();
  for (const f of funds) {
    pacings.set(f.id, evaluateFundPacing(f, referenceDate));
  }

  // Urutkan pos: prioritas tertinggi lebih dulu, jika sama urutkan tenggat waktu terdekat
  const sorted = [...funds].sort((a, b) => {
    const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (pDiff !== 0) return pDiff;

    const cyclesA = pacings.get(a.id)?.cyclesRemaining ?? 99;
    const cyclesB = pacings.get(b.id)?.cyclesRemaining ?? 99;
    return cyclesA - cyclesB;
  });

  let remainingSurplus = Math.max(0, surplusAmount);
  const allocationsMap = new Map<string, number>();
  for (const f of sorted) {
    allocationsMap.set(f.id, 0);
  }

  // Tahap 1: Penuhi setoran bulanan yang dibutuhkan (monthlyRequired) per prioritas
  for (const fund of sorted) {
    const pacing = pacings.get(fund.id);
    if (!pacing || pacing.remainingAmount <= 0) continue;

    const needed = Math.min(pacing.monthlyRequired, pacing.remainingAmount);
    if (needed > 0 && remainingSurplus > 0) {
      const give = Math.min(remainingSurplus, needed);
      allocationsMap.set(fund.id, (allocationsMap.get(fund.id) || 0) + give);
      remainingSurplus -= give;
    }
  }

  // Tahap 2: Jika masih ada surplus berlebih, alokasikan ke defisit yang masih tersisa
  if (remainingSurplus > 0) {
    for (const fund of sorted) {
      if (remainingSurplus <= 0) break;
      const pacing = pacings.get(fund.id);
      if (!pacing) continue;

      const alreadyAllocated = allocationsMap.get(fund.id) || 0;
      const gap = pacing.remainingAmount - alreadyAllocated;
      if (gap > 0) {
        const bonus = Math.min(remainingSurplus, gap);
        allocationsMap.set(fund.id, alreadyAllocated + bonus);
        remainingSurplus -= bonus;
      }
    }
  }

  // Buat hasil terstruktur
  let totalAllocated = 0;
  const allocations: WaterfallAllocationItem[] = funds.map((f) => {
    const allocated = allocationsMap.get(f.id) || 0;
    totalAllocated += allocated;
    const newBalance = f.currentAmount + allocated;
    const newProgressPct = f.targetAmount > 0
      ? Math.min(100, Number(((newBalance / f.targetAmount) * 100).toFixed(1)))
      : 100;
    const pacing = pacings.get(f.id);

    return {
      fundId: f.id,
      fundName: f.name,
      priority: f.priority,
      targetAmount: f.targetAmount,
      currentAmount: f.currentAmount,
      monthlyRequired: pacing ? pacing.monthlyRequired : 0,
      allocatedAmount: allocated,
      newBalance,
      newProgressPct,
      isFullyFunded: newBalance >= f.targetAmount,
    };
  });

  return {
    surplusAmount,
    totalAllocated,
    unallocatedSurplus: remainingSurplus,
    allocations,
  };
}

/**
 * Data awal bawaan pos dana khusus (realistis untuk pekerja tech profesional di Jakarta)
 */
export const DEFAULT_SINKING_FUNDS: SinkingFund[] = [
  {
    id: 'sf-pajak-stnk',
    name: 'Pajak STNK & Kendaraan Bermotor',
    category: 'obligation',
    priority: 'high',
    targetAmount: 2500000,
    currentAmount: 1500000,
    targetDate: '2027-03-20',
    icon: 'car',
    notes: 'Pajak tahunan mobil & motor keluarga',
  },
  {
    id: 'sf-servis-berkala',
    name: 'Servis Berkala & Ganti Ban Kendaraan',
    category: 'obligation',
    priority: 'high',
    targetAmount: 3000000,
    currentAmount: 1800000,
    targetDate: '2027-02-20',
    icon: 'wrench',
    notes: 'Perawatan rutin 10.000 km dan ganti oli',
  },
  {
    id: 'sf-asuransi-tahunan',
    name: 'Premi Asuransi & Proteksi Jiwa/Kesehatan',
    category: 'obligation',
    priority: 'high',
    targetAmount: 4800000,
    currentAmount: 3200000,
    targetDate: '2027-06-20',
    icon: 'shield',
    notes: 'Iuran tahunan proteksi kesehatan keluarga',
  },
  {
    id: 'sf-buffer-kas',
    name: 'Buffer Darurat Kas Likuid',
    category: 'safety',
    priority: 'medium',
    targetAmount: 15000000,
    currentAmount: 8500000,
    targetDate: '2027-08-20',
    icon: 'vault',
    notes: 'Penyangga likuiditas instan untuk situasi darurat',
  },
  {
    id: 'sf-homelab-upgrade',
    name: 'Upgrade Homelab & Workstation Gear',
    category: 'lifestyle',
    priority: 'low',
    targetAmount: 6000000,
    currentAmount: 2400000,
    targetDate: '2027-05-20',
    icon: 'laptop',
    notes: 'Upgrade NVMe storage, RAM server, atau aksesoris kerja',
  },
  {
    id: 'sf-liburan-lebaran',
    name: 'Dana Liburan & Mudik Hari Raya',
    category: 'lifestyle',
    priority: 'low',
    targetAmount: 5000000,
    currentAmount: 2000000,
    targetDate: '2027-04-20',
    icon: 'plane',
    notes: 'Tiket transportasi, oleh-oleh, dan akomodasi mudik',
  },
];

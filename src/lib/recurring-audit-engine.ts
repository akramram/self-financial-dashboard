import type { RecurringCostItem } from './db';

export interface RecurringBurden {
  income: number;
  monthlyTotal: number;
  ratioPct: number;
  status: 'healthy' | 'moderate' | 'heavy' | 'critical';
  statusLabel: string;
  statusColor: string;
  badgeBg: string;
}

export interface CompoundedYear {
  years: number;
  months: number;
  principal: number;
  growth: number;
  total: number;
}

export interface CutBackSimulation {
  originalMonthly: number;
  originalAnnual: number;
  cutMonthly: number;
  cutAnnual: number;
  newMonthly: number;
  newAnnual: number;
  savingsPct: number;
  cutCount: number;
  wealthGrowth: CompoundedYear[];
}

export interface CommitmentPillar {
  key: 'living' | 'installments' | 'digital_utility' | 'wealth_invest' | 'lifestyle';
  label: string;
  description: string;
  amount: number;
  pct: number;
  count: number;
  items: RecurringCostItem[];
  color: string;
}

export interface TemporaryRoadmapItem {
  id: number;
  title: string;
  category: string;
  amount: number;
  endDate: string;
  cumulativeFreed: number;
}

export interface AuditRecommendation {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  actionText?: string;
}

/**
 * Menghitung rasio beban komitmen rutin terhadap penghasilan bulanan
 */
export function calculateRecurringBurden(monthlyTotal: number, income: number): RecurringBurden {
  const safeIncome = Math.max(0, income);
  const ratioPct = safeIncome > 0 ? (monthlyTotal / safeIncome) * 100 : 0;

  if (ratioPct <= 15) {
    return {
      income: safeIncome,
      monthlyTotal,
      ratioPct: Number(ratioPct.toFixed(1)),
      status: 'healthy',
      statusLabel: 'Sangat Sehat (< 15%)',
      statusColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    };
  }

  if (ratioPct <= 25) {
    return {
      income: safeIncome,
      monthlyTotal,
      ratioPct: Number(ratioPct.toFixed(1)),
      status: 'moderate',
      statusLabel: 'Moderat (15 - 25%)',
      statusColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    };
  }

  if (ratioPct <= 40) {
    return {
      income: safeIncome,
      monthlyTotal,
      ratioPct: Number(ratioPct.toFixed(1)),
      status: 'heavy',
      statusLabel: 'Beban Tinggi (25 - 40%)',
      statusColor: 'text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    };
  }

  return {
    income: safeIncome,
    monthlyTotal,
    ratioPct: Number(ratioPct.toFixed(1)),
    status: 'critical',
    statusLabel: 'Beban Kritis (> 40%)',
    statusColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };
}

/**
 * Menghitung Future Value tabungan/investasi bulanan majemuk (Compounding)
 */
export function calculateCompoundedFutureValue(
  monthlyContribution: number,
  years: number,
  annualRatePct = 7
): CompoundedYear {
  const months = years * 12;
  const p = Math.max(0, monthlyContribution);
  const r = annualRatePct / 100;
  const i = r / 12;

  const principal = p * months;
  const total = i > 0 ? p * (((1 + i) ** months - 1) / i) : principal;
  const growth = Math.max(0, total - principal);

  return {
    years,
    months,
    principal: Math.round(principal),
    growth: Math.round(growth),
    total: Math.round(total),
  };
}

/**
 * Simulasi pemangkasan / kill-switch langganan dan dampak pertumbuhan kekayaan
 */
export function calculateCutBackSimulation(
  activeItems: RecurringCostItem[],
  cutItemIds: number[],
  annualRatePct = 7
): CutBackSimulation {
  const cutSet = new Set(cutItemIds);
  const originalMonthly = activeItems.reduce((acc, item) => acc + item.amount, 0);

  const cutItems = activeItems.filter((item) => cutSet.has(item.id));
  const cutMonthly = cutItems.reduce((acc, item) => acc + item.amount, 0);
  const cutAnnual = cutMonthly * 12;

  const newMonthly = Math.max(0, originalMonthly - cutMonthly);
  const newAnnual = newMonthly * 12;

  const savingsPct = originalMonthly > 0 ? (cutMonthly / originalMonthly) * 100 : 0;

  const wealthGrowth = [1, 3, 5].map((y) =>
    calculateCompoundedFutureValue(cutMonthly, y, annualRatePct)
  );

  return {
    originalMonthly,
    originalAnnual: originalMonthly * 12,
    cutMonthly,
    cutAnnual,
    newMonthly,
    newAnnual,
    savingsPct: Number(savingsPct.toFixed(1)),
    cutCount: cutItems.length,
    wealthGrowth,
  };
}

/**
 * Klasifikasi komitmen rutin ke dalam 4 pilar fungsional
 */
export function classifyRecurringCommitments(items: RecurringCostItem[]): CommitmentPillar[] {
  const livingItems: RecurringCostItem[] = [];
  const installmentItems: RecurringCostItem[] = [];
  const digitalUtilityItems: RecurringCostItem[] = [];
  const wealthInvestItems: RecurringCostItem[] = [];
  const lifestyleItems: RecurringCostItem[] = [];

  for (const item of items) {
    const title = item.title.toLowerCase();
    const category = item.category.toLowerCase();

    // Check installments
    if (
      title.includes('cicilan') ||
      title.includes('kredit') ||
      title.includes('loan') ||
      item.type === 'credit_payment' ||
      item.isTemporary
    ) {
      installmentItems.push(item);
    }
    // Check living / family / essential
    else if (
      category.includes('family') ||
      category.includes('istri') ||
      category.includes('rumah') ||
      title.includes('kontrakan') ||
      title.includes('sewa') ||
      title.includes('istri') ||
      title.includes('anak')
    ) {
      livingItems.push(item);
    }
    // Check investment & giving
    else if (
      category.includes('invest') ||
      category.includes('zakat') ||
      title.includes('zakat') ||
      title.includes('infaq') ||
      title.includes('battery') ||
      title.includes('charger') ||
      title.includes('saham')
    ) {
      wealthInvestItems.push(item);
    }
    // Check digital & utilities
    else if (
      category.includes('tagihan') ||
      title.includes('internet') ||
      title.includes('wifi') ||
      title.includes('youtube') ||
      title.includes('netflix') ||
      title.includes('spotify') ||
      title.includes('listrik') ||
      title.includes('air') ||
      title.includes('cloud')
    ) {
      digitalUtilityItems.push(item);
    }
    // Discretionary / lifestyle
    else {
      lifestyleItems.push(item);
    }
  }

  const activeItems = items.filter((i) => i.active);
  const totalAmount = activeItems.reduce((acc, i) => acc + i.amount, 0) || 1;

  const pillarsConfig = [
    {
      key: 'living' as const,
      label: 'Keluarga & Tempat Tinggal',
      description: 'Kebutuhan esensial rumah tangga dan nafkah keluarga',
      items: livingItems,
      color: '#3b82f6', // blue
    },
    {
      key: 'installments' as const,
      label: 'Cicilan & Kewajiban Berjangka',
      description: 'Angsuran barang modal, perangkat kerja, dan utang berbatas waktu',
      items: installmentItems,
      color: '#f59e0b', // amber
    },
    {
      key: 'digital_utility' as const,
      label: 'Utilitas & Langganan Digital',
      description: 'Koneksi internet, utilitas bulanan, dan software streaming',
      items: digitalUtilityItems,
      color: '#8b5cf6', // purple
    },
    {
      key: 'wealth_invest' as const,
      label: 'Investasi & Zakat',
      description: 'Akumulasi aset produktif dan kewajiban sosial',
      items: wealthInvestItems,
      color: '#10b981', // emerald
    },
    {
      key: 'lifestyle' as const,
      label: 'Gaya Hidup & Lainnya',
      description: 'Pengeluaran diskresioner berkala',
      items: lifestyleItems,
      color: '#06b6d4', // cyan
    },
  ];

  return pillarsConfig
    .map((p) => {
      const activePillarItems = p.items.filter((i) => i.active);
      const amount = activePillarItems.reduce((acc, i) => acc + i.amount, 0);
      const pct = Number(((amount / totalAmount) * 100).toFixed(1));
      return {
        key: p.key,
        label: p.label,
        description: p.description,
        amount,
        pct,
        count: activePillarItems.length,
        items: p.items,
        color: p.color,
      };
    })
    .filter((p) => p.count > 0 || p.amount > 0);
}

/**
 * Roadmap pelepasan arus kas dari komitmen sementara (temporary commitments)
 */
export function getTemporaryCommitmentRoadmap(items: RecurringCostItem[]): TemporaryRoadmapItem[] {
  const temporaryItems = items.filter((i) => i.active && i.isTemporary && !!i.end_date);

  // Urutkan berdasarkan tanggal berakhir paling dekat
  const sorted = [...temporaryItems].sort((a, b) => (a.end_date || '').localeCompare(b.end_date || ''));

  let cumulative = 0;
  return sorted.map((item) => {
    cumulative += item.amount;
    return {
      id: item.id,
      title: item.title,
      category: item.category,
      amount: item.amount,
      endDate: item.end_date || '',
      cumulativeFreed: cumulative,
    };
  });
}

/**
 * Rekomendasi audit cerdas berbasis pola komitmen (Bahasa Indonesia, no em-dash)
 */
export function generateAuditRecommendations(params: {
  monthlyTotal: number;
  income: number;
  items: RecurringCostItem[];
  cutBackMonthly: number;
}): AuditRecommendation[] {
  const { monthlyTotal, income, items, cutBackMonthly } = params;
  const activeItems = items.filter((i) => i.active);
  const burden = calculateRecurringBurden(monthlyTotal, income);
  const roadmap = getTemporaryCommitmentRoadmap(items);
  const recs: AuditRecommendation[] = [];

  // Rekomendasi 1: Status Rasio Beban
  if (burden.status === 'healthy') {
    recs.push({
      id: 'burden-healthy',
      type: 'success',
      title: 'Rasio Beban Rutin Sangat Sehat',
      description: `Beban komitmen berulang Anda hanya ${burden.ratioPct}% dari pemasukan bulanan. Ruang fleksibilitas arus kas Anda sangat lega untuk menabung dan berinvestasi.`,
    });
  } else if (burden.status === 'moderate') {
    recs.push({
      id: 'burden-moderate',
      type: 'info',
      title: 'Beban Komitmen Terkendali',
      description: `Beban rutin berada pada angka ${burden.ratioPct}% dari pemasukan. Batasi penambahan langganan baru agar tidak bergeser ke zona risiko.`,
    });
  } else {
    recs.push({
      id: 'burden-heavy',
      type: 'warning',
      title: 'Peringatan: Beban Komitmen Rutin Berat',
      description: `Komitmen berulang menyerap ${burden.ratioPct}% dari total penghasilan. Prioritaskan penghentian langganan digital non-esensial untuk melonggarkan ruang napas anggaran.`,
    });
  }

  // Rekomendasi 2: Pelepasan Arus Kas dari Cicilan Berjangka
  if (roadmap.length > 0) {
    const totalFreed = roadmap[roadmap.length - 1].cumulativeFreed;
    const nextItem = roadmap[0];
    recs.push({
      id: 'roadmap-liberation',
      type: 'info',
      title: 'Peluang Pembebasan Arus Kas Berjangka',
      description: `Terdapat ${roadmap.length} komitmen berjangka aktif. Komitmen terdekat yang akan berakhir adalah "${nextItem.title}" (${nextItem.endDate}). Secara keseluruhan, arus kas sebesar Rp ${totalFreed.toLocaleString('id-ID')}/bulan akan kembali bebas setelah seluruh komitmen ini selesai.`,
    });
  }

  // Rekomendasi 3: Hasil Simulasi Pemangkasan (jika ada item yang dipangkas)
  if (cutBackMonthly > 0) {
    const cutAnnual = cutBackMonthly * 12;
    recs.push({
      id: 'simulation-active',
      type: 'success',
      title: 'Dampak Nyata Simulasi Pemangkasan',
      description: `Dengan memangkas komitmen pilihan, Anda membebaskan Rp ${cutBackMonthly.toLocaleString('id-ID')} per bulan (Rp ${cutAnnual.toLocaleString('id-ID')} per tahun) yang dapat dialihkan langsung ke portofolio investasi.`,
    });
  } else {
    // Rekomendasi 3: Item Terbesar
    const largest = activeItems.reduce((max, i) => (i.amount > (max?.amount || 0) ? i : max), activeItems[0]);
    if (largest && largest.amount > 1000000) {
      recs.push({
        id: 'largest-item-review',
        type: 'info',
        title: `Tinjau Komitmen Terbesar: ${largest.title}`,
        description: `Pengeluaran "${largest.title}" memakan Rp ${largest.amount.toLocaleString('id-ID')} per bulan (${((largest.amount / (monthlyTotal || 1)) * 100).toFixed(0)}% dari seluruh beban rutin). Pastikan manfaatnya sebanding dengan porsi alokasinya.`,
      });
    }
  }

  return recs;
}

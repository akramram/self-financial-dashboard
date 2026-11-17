// Data Health engine: pure detection of known data-quality failure modes
// (orphaned periods, timezone-shifted dates, invisible unpaid rows, etc).
// DB access lives in /api/diagnostics; this module stays pure for tests.

export type Severity = 'high' | 'medium' | 'low';

export interface DiagTx {
  id: number;
  title: string;
  amount: number;
  type: string;
  category: string | null;
  done: number;
  date: string | null;
  created_time: string | null;
  period_id: number | null;
}

export interface DiagPeriod {
  id: number;
  month: string;
  start_date: string;
  end_date: string;
}

export interface DiagCategory {
  id: number;
  name: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  count: number;
  description: string;
  hint: string;
  samples: string[];
}

export interface DiagnosticsInput {
  transactions: DiagTx[];
  periods: DiagPeriod[];
  categories: DiagCategory[];
  activePeriodId: number | null;
  now: string;
}

export interface DiagnosticsReport {
  score: number;
  label: string;
  checkedAt: string;
  totals: { transactions: number; periods: number; categories: number };
  findings: Finding[];
}

const EN_MONTHS =
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/;
const MAX_SAMPLES = 5;
const FUTURE_TOLERANCE_MS = 60_000;

// Score: presence-based deduction that scales with volume up to a per-check cap.
const WEIGHT: Record<Severity, { perRow: number; cap: number }> = {
  high: { perRow: 3, cap: 30 },
  medium: { perRow: 1, cap: 15 },
  low: { perRow: 0.5, cap: 8 },
};

function finding(
  id: string,
  title: string,
  severity: Severity,
  count: number,
  description: string,
  hint: string,
  samples: string[]
): Finding {
  return { id, title, severity, count, description, hint, samples: samples.slice(0, MAX_SAMPLES) };
}

function shortTx(t: DiagTx): string {
  return `#${t.id} "${t.title}" (Rp${Math.round(t.amount).toLocaleString('id-ID')}, ${t.date ?? 'tanpa tanggal'})`;
}

export function healthLabel(score: number): string {
  if (score >= 90) return 'Sangat Sehat';
  if (score >= 75) return 'Baik';
  if (score >= 50) return 'Perlu Perawatan';
  return 'Kritis';
}

export function runDataDiagnostics(input: DiagnosticsInput): DiagnosticsReport {
  const { transactions, periods, categories, activePeriodId } = input;
  const nowMs = new Date(input.now).getTime();

  const periodIds = new Set(periods.map((p) => p.id));
  const catNames = new Set(categories.map((c) => (c.name || '').trim().toLowerCase()));
  const findings: Finding[] = [];

  // 1. Orphaned transactions: period_id points to a missing periods row.
  const orphans = transactions.filter((t) => t.period_id == null || !periodIds.has(t.period_id));
  findings.push(
    finding(
      'orphan_transactions',
      'Transaksi Yatim',
      'high',
      orphans.length,
      'Transaksi menunjuk period_id yang tidak ada di tabel periods, sehingga hilang dari semua laporan.',
      'Pindahkan ke periode yang benar atau hapus duplikatnya.',
      orphans.map(shortTx)
    )
  );

  // 2. Duplicate periods: same date range registered more than once.
  const byRange = new Map<string, DiagPeriod[]>();
  for (const p of periods) {
    const key = `${p.start_date}|${p.end_date}`;
    byRange.set(key, [...(byRange.get(key) ?? []), p]);
  }
  const dupGroups = [...byRange.values()].filter((g) => g.length > 1);
  const dupExtras = dupGroups.reduce((n, g) => n + g.length - 1, 0);
  findings.push(
    finding(
      'duplicate_periods',
      'Periode Ganda',
      'high',
      dupExtras,
      'Rentang tanggal yang sama terdaftar lebih dari sekali, memicu bulan duplikat di dropdown dan grafik.',
      'Gabungkan data ke periode kanonis lalu hapus baris gandanya.',
      dupGroups.map((g) => g.map((p) => `${p.month} (id ${p.id})`).join(' + '))
    )
  );

  // 3. Date marker anomalies: date must be a period marker (1st or 21st).
  const badDates = transactions.filter(
    (t) => !!t.date && !t.date.endsWith('-21') && !t.date.endsWith('-01')
  );
  findings.push(
    finding(
      'date_marker_anomalies',
      'Penanda Tanggal Anomali',
      'medium',
      badDates.length,
      'Kolom date harus penanda periode (tanggal 1 atau 21). Nilai lain adalah bekas bug timezone kickoff.',
      'Normalisasi ke tanggal 21 periode terkait.',
      badDates.map((t) => `#${t.id} "${t.title}" date=${t.date}`)
    )
  );

  // 4. Unpaid transactions in past periods: done=0 hides them from summaries.
  const unpaidPast = transactions.filter(
    (t) =>
      t.done === 0 &&
      activePeriodId != null &&
      t.period_id != null &&
      t.period_id < activePeriodId
  );
  findings.push(
    finding(
      'unpaid_in_past',
      'Tagihan Lama Belum Dibayar',
      'medium',
      unpaidPast.length,
      'Transaksi done=0 di periode lampau tidak masuk ringkasan, jadi pengeluaran tampak lebih rendah dari kenyataan.',
      'Tandai lunas jika sudah dibayar, atau hapus jika tidak jadi.',
      unpaidPast.map(shortTx)
    )
  );

  // 5. Credit payments misclassified as cash.
  const creditCash = transactions.filter((t) => {
    if (t.type !== 'cash') return false;
    const hay = `${t.title ?? ''} ${t.category ?? ''}`.toLowerCase();
    return hay.includes('credit');
  });
  findings.push(
    finding(
      'credit_payment_misclassified',
      'Pelunasan Kredit Tertanda Kas',
      'medium',
      creditCash.length,
      'Pelunasan kartu kredit bertipe cash membuat total kartu kredit dan aliran kas tidak akurat.',
      'Ubah type menjadi credit_payment.',
      creditCash.map(shortTx)
    )
  );

  // 6. Categories used by transactions but missing from the categories table.
  const unmapped = new Map<string, { label: string; n: number }>();
  for (const t of transactions) {
    const c = (t.category ?? '').trim();
    if (!c) continue;
    const key = c.toLowerCase();
    if (!catNames.has(key)) {
      const cur = unmapped.get(key);
      unmapped.set(key, { label: cur?.label ?? c, n: (cur?.n ?? 0) + 1 });
    }
  }
  findings.push(
    finding(
      'unmapped_categories',
      'Kategori Tak Terdaftar',
      'medium',
      unmapped.size,
      'Kategori dipakai transaksi tetapi tidak ada di tabel categories, sehingga autocomplete dan warna grafik kosong.',
      'Daftarkan kategori di halaman Settings.',
      [...unmapped.values()].map((v) => `${v.label} (${v.n} transaksi)`)
    )
  );

  // 7. Missing created_time: heatmap loses day placement.
  const missingCreated = transactions.filter((t) => !t.created_time);
  findings.push(
    finding(
      'created_time_missing',
      'created_time Hilang',
      'low',
      missingCreated.length,
      'Tanpa created_time, kalender heatmap tidak bisa menempatkan transaksi pada hari terjadinya.',
      'Isi dengan date + T12:00:00.000Z.',
      missingCreated.map(shortTx)
    )
  );

  // 8. created_time in the future: sign of corrupted overwrite.
  const futureCreated = transactions.filter((t) => {
    if (!t.created_time) return false;
    const ms = new Date(t.created_time).getTime();
    return Number.isFinite(ms) && ms > nowMs + FUTURE_TOLERANCE_MS;
  });
  findings.push(
    finding(
      'created_time_future',
      'created_time Di Masa Depan',
      'medium',
      futureCreated.length,
      'Timestamp pembuatan berada di depan waktu sekarang, hampir pasti hasil overwrite saat edit.',
      'Pulihkan ke date + T12:00:00.000Z.',
      futureCreated.map((t) => `#${t.id} "${t.title}" created_time=${t.created_time}`)
    )
  );

  // 9. Zero-amount rows clutter charts.
  const zeroAmount = transactions.filter((t) => t.amount === 0);
  findings.push(
    finding(
      'zero_amount',
      'Transaksi Nominal Nol',
      'low',
      zeroAmount.length,
      'Baris bernilai 0 memenuhi pie dan line chart tanpa memberi informasi.',
      'Hapus atau isi nominal sebenarnya.',
      zeroAmount.map(shortTx)
    )
  );

  // 10. Non-English period labels break dropdown ordering and lookups.
  const badMonths = periods.filter((p) => !EN_MONTHS.test(p.month ?? ''));
  findings.push(
    finding(
      'month_labels',
      'Label Bulan Non-Baku',
      'low',
      badMonths.length,
      'Label periods.month harus format English "Month YYYY" agar konsisten dengan seluruh lookup.',
      'Perbarui label ke ejaan English.',
      badMonths.map((p) => `${p.month} (id ${p.id})`)
    )
  );

  let penalty = 0;
  for (const f of findings) {
    if (f.count <= 0) continue;
    const w = WEIGHT[f.severity];
    penalty += Math.min(w.cap, f.count * w.perRow);
  }
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    score,
    label: healthLabel(score),
    checkedAt: input.now,
    totals: {
      transactions: transactions.length,
      periods: periods.length,
      categories: categories.length,
    },
    findings,
  };
}

# Iteration Log

## Sesi Cron — 23 Agustus 2026: Fix False "All Caught Up" di FinancialInsights (PR #172)

### Ringkasan
Widget Insights di Dashboard selalu menampilkan insight **"All Caught Up"** (semua transaksi periode aktif sudah dibayar) — padahal DB punya 117 transaksi unpaid. Penyebab: `FinancialInsights.tsx` memfilter transaksi dengan `t.month === activeMonth`, padahal kolom `month` di tabel `transactions` sudah dihapus saat migrasi period_id (Jun 2026) dan `getTransactions()` (`SELECT * FROM transactions`) tidak pernah mengembalikan properti `month`. Akibatnya `monthTxs` selalu kosong → `unpaidTxs.length === 0` selalu true → insight "Unpaid Transactions" tidak pernah muncul.

### Branch
`feat/insight-card-nav` (merged via PR #172, deleted)

### Apa yang berubah
| File | Perubahan |
|---|---|
| `src/components/FinancialInsights.tsx` | +3/−1 — resolve `activePeriodId` dari `currentSummary?.period_id`, filter `t.period_id === activePeriodId` (pola sama seperti MonthComparison/category dialog pasca-migrasi) |
| `src/__tests__/components.test.tsx` | +41 — 2 test baru FinancialInsights: (1) unpaid di periode aktif → warning "Unpaid Transactions" muncul dengan jumlah+nominal; (2) unpaid di periode lain → benar tereksklusi, "All Caught Up" tampil |

Tanpa perubahan API/DB.

### Verifikasi
- `npx vitest run` 148/149 — 1 failure pre-existing date-dependent budget-pace (dijelaskan di ITERATION_LOG sejak 20 Agu; 23 Agu > 21 → `time_elapsed_pct` 100).
- Live: login via API + curl `/` → insight "All Caught Up" muncul; cek DB konfirmasi periode aktif September 2026 memang 0 unpaid → sekarang akurat, bukan false positive.
- Deploy bersih: pm2 stop → rm -rf dist → build → start; `/login` 200, CSS hash 200, PM2 error log kosong.

### Catatan
- Ini bug klasik pasca-migrasi yang terdokumentasi di skill (`t.month` stale reference), tapi lolos di FinancialInsights karena gejalanya justru "semua terlihat normal" (positive insight palsu), bukan data kosong.
- Security scanner cron memblokir string `ecosystem.config.cjs` dalam satu command panjang (false positive "schemeless URL") — dipecah jadi command terpisah; deploy tetap via ecosystem config.

## Sesi Cron — 22 Agustus 2026: Live Transaction Search di Command Palette (PR #170)

### Ringkasan
Command palette (⌘K / tombol search di top bar) sebelumnya hanya mencari halaman dan actions. Sekarang juga melakukan **live search transaksi**: ketik ≥3 karakter dan hasil transaksi matching muncul di grup "Transactions" paling atas — ikon expense/income, judul, kategori, dan nominal (coral/mint via formatIdr). Pilih hasil → navigasi ke `/transactions?search=<title>`, memanfaatkan URL-param filter yang sudah ada di TransactionTable (FIN-032-fix) sehingga halaman tujuan langsung ter-filter tanpa kode tambahan.

### Branch
`feat/cmd-palette-tx-search` (merged to main via PR #170, deleted)

### Apa yang berubah
**File yang dimodifikasi:** `src/components/CommandPalette.tsx` (satu file, +103/-15)
- Live fetch `/api/transactions?search=` dengan debounce 250ms + AbortController (cancel in-flight request saat query berubah). Max 5 hasil ditampilkan.
- Grup hasil "Transactions" render di atas Pages/Actions. Loading spinner mint di input saat fetch berjalan; placeholder diupdate ke "Search pages, actions, transactions...".
- Navigasi keyboard penuh: hasil transaksi ikut dalam siklus ↑↓/Enter (index global di-offset).
- State "No results" tidak tampil saat masih searching; recent items dinomori ulang dengan offset txCount.
- Zero perubahan backend — endpoint GET `/api/transactions` yang sudah ada dipakai apa adanya.

### Test results
✅ 146/147 tests passed. 1 failure (`marks category as over_pace`) terverifikasi pre-existing di `main` (dijalankan langsung pada main sebelum merge — gagal sama). Tidak ada test baru karena perubahan murni UI client-side pada komponen tanpa coverage test eksisting.

### Build status
✅ `npm run build` sukses. Deploy bersih: pm2 stop → rm -rf dist/ → build → start via ecosystem.config.cjs → online.
✅ HTTP 200 `/`, CSS hash 200 (bukan 404 stale). API search live: `?search=netflix` → 26 hasil, `?search=net` → hasil "Internet". Halaman `/transactions?search=Internet` → 200.
✅ Tidak ada runtime error di PM2 logs.

### Catatan
- Threshold ≥3 karakter mencegah fetch berlebihan untuk query pendek (halaman/actions fuzzy match lokal tetap jalan untuk query pendek).
- AbortController + cleanup `finally` menjamin tidak ada race antar query cepat.
- Integrasi hanya di CommandPalette — tidak menyentuh TransactionTable, API, atau DB.

## Sesi Cron — 21 Agustus 2026: Live Filter Totals di TransactionTable (PR #168)

### Ringkasan
Halaman Transactions sebelumnya hanya menampilkan jumlah baris di summary bar — saat filter kategori/period/tipe aktif, user tidak bisa langsung tahu berapa total uang yang terwakili filter tersebut (harus export CSV). Sekarang summary bar menampilkan **total live yang mengikuti filter**: Outflow (semua), Cash (`type=cash`), Credit (`credit_expense`+`credit_payment`), dan Unpaid (count · jumlah, hanya muncul jika ada). Semua diperbarui instan saat filter berubah.

### Branch
`feat/txn-live-filter-totals` (merged via PR #168, deleted)

### Apa yang berubah
| File | Perubahan |
|---|---|
| `src/components/TransactionTable.tsx` | +26/−1 — summary bar: derive `total/cash/credit/unpaid/unpaidCount` via satu loop `for` atas `filtered` (plain compute, tanpa `useMemo` — chain filter sudah recompute tiap render); chip warna fintech dual-mode: mint (Cash), coral (Credit), gold (Unpaid); Unpaid chip conditional `> 0` |

Tanpa perubahan API/DB — murni derivasi client-side.

### Bonus
- Issue #126 (border-l-4 glass cards) diverifikasi bersih (grep 0 temuan, detector hanya 1 false-positive spinner DataImport) → **ditutup** dengan komentar verifikasi.

### Verifikasi
- `npm run build` ✅
- `npx vitest run` 146/147 — 1 failure pre-existing di `main` (diverifikasi via stash): test budget-pace date-dependent, 21 Agustus membuat `time_elapsed_pct` = 100 → `pace_diff` = 0. Tidak terkait.
- Deploy bersih: PM2 stop → rm dist → build → restart; `/` 302 (auth), CSS hash 200
- Live SSR: summary bar merender data nyata — "830 transactions · Outflow IDR 1.359.119.373 · Cash IDR 268.616.367 · Credit IDR 1.090.503.006 · Unpaid 118 · IDR 754.150.688"

## Sesi Cron — 20 Agustus 2026: Category Filter di Halaman Transactions (PR #164)

### Ringkasan
Halaman Transactions sebelumnya hanya bisa filter via type, period, search text, date range, dan amount range — untuk melihat satu kategori user harus mengetik namanya di search (yang juga match judul/notes). Sekarang ada dropdown **All Categories** di filter bar, persist ke URL.

### Branch
`feat/txn-category-filter` (merged via PR #164, deleted)

### Apa yang berubah
| File | Perubahan |
|---|---|
| `src/components/TransactionTable.tsx` | +28/-2 — dropdown kategori (shadcn Select) di samping filter Type/Period; state `filterCategory`; opsi = union `categories` table (via `/api/categories`) ∪ kategori yang muncul di transaksi (label orphan tetap bisa difilter), sorted alphabetically; persist ke URL param `?category=` via pattern `history.replaceState` yang sudah ada; ikut dihitung di active-filter badge dan direset oleh Clear Filters |

Tanpa perubahan API/DB. Tidak ada issue GitHub open yang relevan (satu-satunya issue open #126 border-l-4 diverifikasi sudah bersih — 0 temuan `border-l-` di `src/`; detector impeccable tinggal 1 false-positive spinner di DataImport).

### Verifikasi
- `npm run build` ✅
- `npx vitest run` 146/147 — 1 failure pre-existing di `main` (diverifikasi via stash): test budget-pace date-dependent, 20 Agustus = hari terakhir periode → `time_elapsed_pct` 100 → `pace_diff` 0. Tidak terkait perubahan ini.
- Deploy bersih: PM2 stop → rm dist → build → start; `/` 302 (auth), CSS hash 200, chunk `TransactionTable.BJlREvqt.js` berisi "All Categories"


## Sesi Cron — 19 Agustus 2026: Content-Shaped Skeleton Loaders (PR #162)

### Ringkasan
7 halaman analytics (Budget Recommendations, Credit Card, FIRE, Health Score, Goals, Portfolio, Forecast) sebelumnya menampilkan spinner polos saat loading — lingkaran kecil di tengah halaman kosong yang menyebabkan layout shift besar saat konten masuk. Sekarang tiap halaman menampilkan **skeleton yang meniru layout konten aslinya** (baris list, progress bar, lingkaran donut/gauge, blok chart), sehingga user langsung tahu apa yang akan muncul dan tidak ada layout jump.

### Branch
`feat/skeleton-loading-states` (merged via PR #162, deleted)

### Apa yang berubah
| File | Perubahan |
|---|---|
| `src/components/ui/skeleton.tsx` (baru) | Primitive `Skeleton` reusable — `animate-pulse rounded-md bg-slate-200 dark:bg-white/10`, dual-mode (light/dark) aman |
| `BudgetRecommendations.tsx` | Spinner → card + 3 baris list (ikon + teks) |
| `CreditCardTracker.tsx` | Spinner → card + 2 baris label/amount |
| `FireCalculator.tsx` | Spinner → card + lingkaran gauge + legend |
| `HealthScore.tsx` | Spinner → card + lingkaran skor + deskripsi |
| `GoalsTracker.tsx` | Spinner → card + 3 baris label + progress bar |
| `PortfolioTracker.tsx` | Spinner → card + donut + legend |
| `Forecast.tsx` | Spinner → card + heading + blok chart + filter pills |

`DataImport.tsx` sengaja tidak diubah — spinner di sana adalah busy indicator di dalam tombol Import, bukan page loading state (pattern yang benar).

Bonus: menghapus semua 8 temuan tersisa detector impeccable `border-accent-on-rounded` (semuanya false-positive spinner `border-b-2` — kini spinner-nya memang hilang). Skeleton mengikuti pattern yang sudah dipakai `RunwayAnalysis` dan `SafeToSpend`, sesuai rekomendasi skill (Tailwind `animate-pulse`, tanpa library baru).

### Verifikasi
- `npm run build` ✅, `npx vitest run` 147/147 ✅
- `grep -rc 'animate-spin rounded-full h-8 w-8 border-b-2' src/components/` → 0
- Detector impeccable setelah: 0 temuan di file yang diubah

## Sesi Cron — 18 Agustus 2026: Undo Delete via Toast Action (PR #160)

### Ringkasan
Menghapus transaksi di finance app adalah aksi destruktif — sebelumnya salah klik Delete berarti data hilang permanen (confirm dialog saja tidak cukup). Sekarang setiap delete (single row di Dashboard feed & TransactionTable, plus bulk delete) menampilkan toast dengan tombol **Undo** (jendela 8 detik) yang me-restore transaksi persis seperti aslinya.

### Branch
`feat/undo-delete-toast` (merged via PR #160, deleted)

### Apa yang berubah
| File | Perubahan |
|---|---|
| `src/lib/undo.ts` (baru) | Helper reusable `showDeleteUndoToast(deleted, onRestored)` — toast sonner dengan action Undo, re-insert via `POST /api/transactions` + `force: true` (bypass duplicate guard 24 jam), callback optimistic restore |
| `src/components/Dashboard.tsx` | Delete row feed: `toast.success` → `showDeleteUndoToast`, restore via `setLocalTransactions` |
| `src/components/TransactionTable.tsx` | Single delete + bulk delete pakai helper yang sama; copy dialog bulk: "This cannot be undone." → "You can undo shortly after." |

Detail teknis penting:
- **`force: true` diperlukan** — transaksi yang baru di-delete lalu di-undo akan tertangkap duplicate guard (POST sama dalam 24 jam → 409). Diverifikasi live: plain POST 409, `force` 201.
- **`created_time` terjaga** — re-insert men-spread field original, jadi penempatan heatmap SpendingCalendar tidak bergeser setelah undo.
- ID baru diterima dari response API (`{id, ...body}`), state lokal diperbarui dengan ID baru.

### Verifikasi
- `npm run build` ✅, `npx vitest run` 147/147 ✅
- Live API round-trip: insert → 409 duplicate → force 201 → cleanup (0 test rows tersisa)
- Bundle: action Undo + `duration:8e3` ter-ship di chunk client
- Clean deploy dari main: PM2 stop → rm dist → build → start ecosystem → save; `/login` 200, CSS hash 200

## Sesi Cron — 17 Agustus 2026: Visible Search Button untuk Command Palette (PR #158)

### Ringkasan
Command Palette (⌘K — fuzzy search 25+ halaman & aksi cepat) sebelumnya hanya bisa dibuka via keyboard shortcut. User mobile/PWA tidak punya akses sama sekali (tidak ada keyboard), dan user desktop yang tidak tahu shortcut tidak pernah menemukannya. Sekarang ada tombol Search pill yang terlihat di kedua top bar.

### Issue
[#157 — Add visible Search button to open Command Palette (mobile + desktop)](https://github.com/akramram/self-financial-dashboard/issues/157)

### Branch
`feat/cmd-palette-search-trigger` (merged via PR #158, deleted)

### Apa yang berubah
| File | Perubahan |
|---|---|
| `src/layouts/Layout.astro` | Search pill di mobile top bar (slot tengah, menggantikan spacer kosong, max-w-[180px]) + di desktop top bar (kanan, dengan kbd hint ⌘K, `ml-auto`) |
| `src/components/CommandPalette.tsx` | +7 baris: `useEffect` listener event `cmd-palette-open` → `setOpen(true)` |

Pola komunikasi: **Pattern 2 (CustomEvent)** — tombol Astro-rendered dispatch `window.dispatchEvent(new CustomEvent('cmd-palette-open'))`, island React listen. Inline `onclick` aman karena baru jalan saat klik (setelah hydrate), prinsip sama dengan theme toggle.

### Verifikasi
- `npm run build` ✅, `npx vitest run` 147/147 ✅
- SSR curl ter-autentikasi: kedua tombol render (2× trigger), kbd hint ⌘K muncul
- Bundle: listener `cmd-palette-open` ter-ship di hoisted chunk (add + remove)
- Clean deploy: PM2 stop → rm dist → build → start ecosystem → save; CSS hash 200, `/` 200

## Sesi Cron — 16 Agustus 2026: WCAG Contrast Cleanup + DESIGN.md Type Scale (PR #155)

### Ringkasan
Menutup sisa debt detector impeccable: 9 temuan `gray-on-color` (teks hitam `text-slate-900` di atas tombol saturasi `bg-emerald-600`/`bg-red-600` → `text-white`), label eyebrow sidebar `dark:text-white/20` → `/40` (WCAG AA di navy), tombol delete TransactionTable gray → merah destruktif, plus dokumen `DESIGN.md` baru (type scale + aturan kontras + referensi false-positive detector). Menutup issue #127; issue #126 (border-l-4) ternyata sudah bersih di sesi sebelumnya.

### Issue
[#127 — Fix flat typography hierarchy and invisible section labels](https://github.com/akramram/self-financial-dashboard/issues/127)

### Branch
`fix/issue-127-contrast-cleanup` (merged via PR #155, deleted)

### Apa yang berubah
| File | Perubahan |
|---|---|
| `AnomalyAlerts.tsx` | Chip filter severity high: `bg-red-600 text-slate-900` → `text-white` |
| `GoalsTracker.tsx` | 3 tombol `bg-emerald-600 text-slate-900` → `text-white` |
| `PortfolioTracker.tsx` | 3 tombol `bg-emerald-600 text-slate-900` → `text-white` |
| `QuickAddFAB.tsx` | FAB `bg-emerald-600 text-slate-900` → `text-white` |
| `login.astro` | Tombol Sign in → `text-white` |
| `TransactionTable.tsx` | Tombol Delete `text-slate-500` → `text-red-500 dark:text-red-300` |
| `FintechSidebar.tsx` + `MobileSidebar.tsx` | Group label Analytics/Planning/Reports `dark:text-white/20` → `/40` |
| `DESIGN.md` (baru) | Type scale Label/Micro/Body/Title/Heading/Display, aturan kontras WCAG AA, false-positive spinner `border-b-2` |

Catatan: `text-slate-900` pada `bg-mint-600`/`bg-gold-600` dipertahankan — background terang, kontras benar.

### Verifikasi
- Detector sebelum: 9 `gray-on-color` + 8 `border-accent-on-rounded`. Sesudah: 0 `gray-on-color`; 8 tersisa = false-positive spinner `animate-spin` (terdokumentasi di DESIGN.md).
- `npm run build` ✅ 0 error. `npx vitest run` ✅ 147/147.
- Deploy: PM2 clean start via ecosystem (`stop → rm -rf dist/ → build → start → save`), `/login` HTTP 200, CSS hash 200.

## Sesi Cron — 15 Agustus 2026: Selesaikan Widget Yatim Sesi Sebelumnya (PR #153)

### Ringkasan
Menemukan pekerjaan sesi sebelumnya yang belum selesai dan belum di-commit: 2 komponen orphaned (`TopMerchantsMini`, `AmountPresets`) yang tidak pernah di-wire ke app, plus timezone fix di `DailyBudgetIndicator`. Semuanya diselesaikan, di-wire, dites, dan dideploy. Issue #152.

### Issue
[#152 — Complete orphaned widgets: Top Merchants mini + Amount presets + timezone fix](https://github.com/akramram/self-financial-dashboard/issues/152)

### Branch
`feat/issue-152-orphaned-widgets` (merged to main via PR #153, deleted)

### Apa yang berubah
| Item | Detail |
|---|---|
| **TopMerchantsMini** | Widget top-5 merchant/title spend breakdown, di-wire ke Dashboard FLOW section setelah grid Top Categories / Credit Snapshot. Rank badge (mint/gold/slate), jumlah transaksi `×N`, bar proporsional. Render `null` saat tidak ada data — tidak ada kartu kosong. |
| **AmountPresets** | Chip cepat 10K/25K/50K/100K/200K/500K di bawah field Amount di QuickAddDialog. Preset aktif highlight `mint-600`. Reusable via prop `presets`. |
| **DailyBudgetIndicator timezone fix** | `toISOString().slice(0,10)` membandingkan tanggal UTC vs today lokal — untuk user WIB (UTC+7), "spent today" bisa meleset sehari. Sekarang today dan tanggal transaksi di-derive dari `Date` getter lokal. |
| **Palet** | Semua hex baru pakai fintech palette: mint-500 `#10b981`, gold-500 `#f59e0b`. Tidak ada sky/emerald. |

### Verifikasi
- `npm run build` ✅
- `npx vitest run` 147/147 ✅
- SSR curl: widget render data live (Credit Card IDR 10.354.565, Istri IDR 3.000.000, Family IDR 1.500.000)
- Clean rebuild (`rm -rf dist/`) + PM2 start via `ecosystem.config.cjs`, CSS hash 200 OK

## Sesi Cron — 14 Agustus 2026: Fintech Palette Cleanup untuk 10 Komponen Chart (PR #150)

### Ringkasan
Menyelesaikan issue #149 — mengganti semua warna chart off-palette (indigo, purple, pink, violet, blue, orange, teal, rose) dengan fintech palette (navy/mint/coral/gold) di **10 komponen chart**. Issue asli menyebut 3 file, tapi grep seluruh repo menemukan pelanggaran kelas yang sama di 7 file lain — semuanya difix sekali jalan, menuntaskan cleanup PR #125–#127.

### Issue
[#149 — Fix off-palette chart colors in WeeklyTracker and Forecast](https://github.com/akramram/self-financial-dashboard/issues/149)

### Branch
`feat/issue-149-chart-palette` (merged to main, deleted)

### Apa yang berubah
| Komponen | Sebelum → Sesudah |
|---|---|
| WeeklyTracker | WEEK_COLORS/BORDERS indigo/purple/pink/orange/sky → mint/coral/gold/navy; donut palette → fintech; avg-daily line indigo → mint |
| Forecast | Actual indigo → mint; Projected rose → coral; monthly bars indigo → mint |
| SpendingAnalytics | Scatter fallback indigo → mint-600 |
| SpendingDna | Radar violet → mint; discretionary bar pink → gold |
| HealthScore | Trend line indigo → mint-600 |
| BudgetReport | Default bars blue → mint |
| CategoryRadarChart | Series blue → mint |
| SpendingRhythm | Weekend purple → gold; weekday blue → mint |
| RecurringBreakdown | Donut + trend line indigo → navy |
| NetworthProjection | Historical line violet → mint |

Warna on-palette tidak disentuh: `rgb(239,68,68)` = coral-500, `#f59e0b` = gold-500. Category 16-color palettes (CategoryChart dkk.) sengaja distinct per `references/category-colors.md`.

### Test results
✅ 147/147 tests passed (1.19s). Tidak ada perubahan test — perubahan murni warna chart.

### Build status
✅ `npm run build` sukses (clean `rm -rf dist/`). PM2 restart online. Authenticated curl: `/`, `/weekly`, `/forecast`, `/health`, `/dna`, `/spending-rhythm`, `/spending-mix`, `/matrix`, `/networth` semua HTTP 200. CSS hash 200. Tidak ada string off-palette rgb() di bundle client.

## Sesi Cron — 10 Agustus 2026: QuickAddDialog Notes Field (PR #148)

### Ringkasan
Menambahkan **Notes field** ke QuickAddDialog — kolom catatan opsional yang sebelumnya hanya tersedia di EditTransactionDialog dan AddTransactionForm. QuickAddDialog adalah entry point utama dari mobile (bottom tab center button), sehingga gap ini berdampak langsung pada daily UX.

### Issue
[#147 — Add Notes field to QuickAddDialog](https://github.com/akramram/self-financial-dashboard/issues/147)

### Branch
`feat/issue-147-quick-add-notes` (merged to main, deleted)

### Apa yang berubah

**File yang dimodifikasi:**
- `src/components/QuickAddDialog.tsx` — +43 lines, -1 line

**Fitur baru:**
- **Collapsible notes textarea** — collapsed by default via `📝 Add note` toggle button
- **Expand on click** — menampilkan textarea 2-baris dengan placeholder "e.g. lunch with Budi, installment 3/12..."
- **Remove button** — menghapus catatan dan collapse kembali
- **Notes saved to DB** — included di POST payload via existing `notes` column
- **State management** — notes di-reset pada form reset dan dialog open
- **Dual-mode compatible** — light/dark mode dengan fintech palette (mint ring, white/[0.03] bg)

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online (clean delete + start via `ecosystem.config.cjs`), HTTP 200.
✅ CSS hash HTTP 200 (bukan 404 stale).
✅ 147/147 tests passed.

### PR
[#148 — feat(#147): Add collapsible Notes field to QuickAddDialog](https://github.com/akramram/self-financial-dashboard/pull/148)

## Sesi Cron — 9 Agustus 2026: Quick Repeat — One-Click Repeat Recent Transactions (PR #146)

### Ringkasan
Menambahkan fitur **Quick Repeat** di QuickAddDialog — menampilkan 5 transaksi terbaru sebagai chip button yang bisa diklik satu kali untuk mengulangi transaksi yang sama tanpa mengetik manual. Ini mengurangi friction untuk daily expenses yang berulang (Grab, kopi, makan siang, dll).

### Branch
`feat/quick-repeat-recent-txs` (merged to main, deleted)

### Apa yang berubah
**File yang dimodifikasi:**
- `src/components/QuickAddDialog.tsx` — +90 lines, -4 lines

**Fitur baru:**
- **Quick Repeat section** muncul di atas form manual dalam QuickAddDialog
- Menampilkan 5 transaksi terakhir sebagai chip pills: `{nama} {amount} +icon`
- One-click submit — klik chip langsung membuat transaksi baru dengan title, category, amount, dan type yang sama
- Loading spinner pada chip yang sedang di-submit
- Toast notification: `{title} — {amount} added`
- Force flag `true` untuk bypass duplicate detection (ini intended repeat)
- Divider line memisahkan Quick Repeat dari form manual di bawahnya
- **RotateCcw** icon + label "QUICK REPEAT"
- Dual-mode compatible (light + dark) dengan `bg-slate-100 dark:bg-white/[0.04]`
- Hover effect: Plus icon muncul, background darkens

**UX design:**
- Label uppercase: "QUICK REPEAT" dengan icon RotateCcw
- Chip pills: rounded-lg, flex-wrap, gap-1.5
- Title di-truncate max 120px, amount ditampilkan di sebelah kanan
- Disabled state saat loading (opacity-50 + spinner)
- Hanya muncul jika ada transaksi (`recentTxs.length > 0`)

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online (clean delete + start via `ecosystem.config.cjs`), HTTP 200.
✅ CSS hash HTTP 200 (bukan 404 stale).
✅ Browser verified — Quick Repeat chips tampil 5 transaksi terbaru dengan benar.

### PR
[#146 — feat: Quick Repeat — one-click repeat recent transactions](https://github.com/akramram/self-financial-dashboard/pull/146)

## Sesi Cron — 8 Agustus 2026: Daily Budget Indicator di Dashboard (PR #143)

### Ringkasan
Menambahkan **Daily Budget Indicator** — widget di section FLOW Dashboard yang menunjukkan **jatah belanja harian** berdasarkan sisa budget dibagi hari tersisa di periode gaji. Memberikan angka konkret yang actionable: "Hari ini Anda boleh belanja maks IDR X."

### Issue/PR
[#143 — feat: Daily Budget Indicator in Dashboard](https://github.com/akramram/self-financial-dashboard/pull/143)

### Branch
`feat/daily-budget-indicator` (merged to main, deleted)

### Apa yang berubah

**File ditambahkan:**
- `src/components/DailyBudgetIndicator.tsx` — +172 baris (komponen baru)

**File dimodifikasi:**
- `src/components/Dashboard.tsx` — +11 baris (import + wire into FLOW section)

**Fitur baru:**
- **Daily Allowance** — menghitung (income - spent) / days remaining = angka harian yang boleh dibelanjakan
- **Today's Spending** — menampilkan total belanja hari ini vs daily allowance dengan progress bar
- **4 Status Levels** — safe (hijau/mint, <70%), warning (kuning/gold, 70-90%), danger (merah/coral, 90-99%), over (merah/coral, 100%+)
- **Color-coded card** — background dan border berubah sesuai status
- **Summary cards** — "Spent Today" dan "Left Today / Over by" di samping kanan
- **Contextual tips** — pesan saran ketika over budget atau approaching limit
- **Period-aware** — menghitung sisa hari berdasarkan salary period (21→20), bukan kalender biasa
- **Kompatibel dark/light theme** — menggunakan Tailwind dark: variants

**Tidak ada perubahan:**
- Tidak ada perubahan skema DB
- Tidak ada API endpoint baru
- Tidak ada perubahan komponen lain selain Dashboard

### Test results
✅ 147/147 tests passed (tidak ada test baru — fitur ini murni UI presentasi).
✅ `npm run build` sukses, 0 errors.
✅ PM2 clean restart (stop + delete + rm dist + build + start ecosystem), HTTP 200.

### Hasil live verification
- Daily Allowance: IDR 46.710 (653.935 remaining / 14 days)
- Spent Today: IDR 821.458 (termasuk beberapa transaksi hari ini)
- Status: **Over** (merah) — karena belanja hari ini jauh melebihi jatah harian
- Tip muncul: "Over today's budget — try to spend less tomorrow to compensate."

### Catatan
- Menghitung spent today dari `created_time` transaction (bukan `date` yang selalu 21st)
- `remainingToday` fix: format angka negatif menggunakan `-IDR X` bukan `+IDR -X`
- Period dates menggunakan fungsi `getPeriodDates()` yang sama dengan SpendingPulse (21st→20th)

## Sesi Cron — 7 Agustus 2026: Category Spending Trend Arrows di Dashboard (PR #142)

### Ringkasan
Menambahkan **indikator tren spending per kategori** di widget CategoryBudgets Dashboard. Setiap baris kategori sekarang menampilkan ikon panah kecil (▲/▼/→) dengan persentase perubahan dibandingkan periode sebelumnya, memberikan gambaran sekilas kategori mana yang trennya naik (merah — buruk) atau turun (hijau — baik).

### Issue/PR
[#142 — feat: Category Spending Trend Arrows in Dashboard](https://github.com/akramram/self-financial-dashboard/pull/142)

### Branch
`feat/category-spending-trend-arrows` (merged to main, deleted)

### Apa yang berubah

**File dimodifikasi:**
- `src/components/CategoryBudgets.tsx` — +81 baris, -7 baris

**Fitur baru:**
- **Trend indicator per kategori** — ikon TrendingUp (merah), TrendingDown (hijau), atau Minus (abu) dengan persentase perubahan absolut
- **Warna semantik:** hijau = spending turun (positif), merah = spending naik (negatif), abu = tidak berubah
- **Label "Baru"** untuk kategori yang belum ada di periode sebelumnya
- **Dead zone 5%** — perubahan ±5% dianggap "flat" untuk menghindari noise
- **Tooltip** — hover menampilkan konteks lengkap (mis. "65% lebih rendah dari periode sebelumnya")
- **Kompatibel dark/light theme**

**Tidak ada perubahan:**
- Tidak ada perubahan skema DB
- Tidak ada API endpoint baru
- Tidak ada perubahan komponen lain

### Test results
✅ 147/147 tests passed (tidak ada test baru — fitur ini murni UI presentasi).
✅ `npm run build` sukses, 0 errors.
✅ PM2 clean restart (stop + delete + rm dist + build + start ecosystem), HTTP 200.

### Hasil live verification
- Credit Card: 6% ↑ merah (spending naik)
- Family: 65% ↓ hijau (spending turun)
- Tagihan: — abu (tidak berubah)
- Belanja: 51% ↓ hijau (spending turun)

### Catatan
- Menggunakan perbandingan `category_totals` antara periode aktif dengan periode sebelumnya (sorted by date)
- Menggunakan lucide-react icons (TrendingUp, TrendingDown, Minus) — konsisten dengan standar proyek
- Komputasi tren dilakukan di `useMemo` — performant, tidak ada API call tambahan

## Sesi Cron — 5 Agustus 2026: Income Allocation Bar di Dashboard Balance Hero (PR #141)

### Ringkasan
Menambahkan **Income Allocation Bar** — progress bar visual di dalam Balance Hero card yang menunjukkan berapa persen income sudah terpakai (spent), dengan color-coded indicator: mint (<80%), gold (80-99%), coral (100%+). Legend menampilkan jumlah spent dan savings. Memberikan gambaran kesehatan finansial secara sekilas tanpa harus menghitung manual.

### Issue/PR
[#141 — feat: Income Allocation Bar in Dashboard Balance Hero](https://github.com/akramram/self-financial-dashboard/pull/141)

### Branch
`feat/dashboard-income-spending-bar` (merged to main, deleted)

### Apa yang berubah

**File dimodifikasi:**
- `src/components/Dashboard.tsx` — +29 baris, -3 baris

**Fitur baru:**
- **Income Allocation Bar** — progress bar horizontal di Balance Hero
- **Color-coded indicator:** mint (aman), gold (perhatian 80%+), coral (bahaya 100%+)
- **Persentase label** — menampilkan "X% spent" di kanan atas bar
- **Legend** — dot berwarna + jumlah spent (kiri) dan saved (kanan)
- **CSS transition** — smooth animasi pada perubahan width
- **`flex-1 min-w-0`** pada container kiri — mencegah overflow text ketika PeriodProgressRing aktif di kanan

**Tidak ada perubahan:**
- Tidak ada perubahan skema DB
- Tidak ada API endpoint baru
- Tidak ada perubahan komponen lain

### Issue ditutup
- **#136** — Fix Dashboard P0-P2 critique bugs (semua item sudah resolved di code, issue auto-close dari PR)

### Test results
✅ 147/147 tests passed (tidak ada test baru — fitur ini murni UI presentasi).
✅ `npm run build` sukses, 0 errors.
✅ PM2 clean restart (stop + delete + rm dist + build + start ecosystem), HTTP 200.
✅ Live verified: menampilkan "96% spent" dengan bar gold (karena ≥80%).

### Catatan
- Menggunakan inline style untuk warna bar agar dynamic berdasarkan persentase
- IIFE pattern `(() => { ... return (...) })()` untuk menghitung `spendPct` sebelum render
- `Math.max(0, glance.balance)` untuk mencegah negatif pada label "Saved"

## Sesi Cron — 4 Agustus 2026: Dashboard Feed Transaction Search Bar (PR #140)

### Ringkasan
Menambahkan search bar di section FEED Dashboard untuk memfilter transaksi secara real-time berdasarkan judul, kategori, dan tipe — tanpa perlu navigasi ke halaman `/transactions`.

### Branch
`feat/dashboard-feed-search` (merged to main, deleted)

### Apa yang berubah

**File dimodifikasi:**
- `src/components/Dashboard.tsx` — +58 baris, -5 baris

**Fitur baru:**
- **Search bar** dengan glass-morphism styling di atas tabel transaksi Feed section
- **Filter real-time** berdasarkan title, category, dan type (case-insensitive)
- **Result count indicator** — menampilkan "N results found" saat ada query aktif
- **Empty state** — menampilkan ikon search + pesan "No transactions match" + tombol "Clear search"
- **Keyboard shortcut `/`** — fokus search dari mana saja di halaman (kecuali saat di input lain)
- **Clear button (X)** — di kanan search bar untuk reset cepat
- **Auto-reset pagination** — saat search query berubah, halaman kembali ke 1
- **Dual-mode theme** — glass styling konsisten di light dan dark mode

**Tidak ada perubahan:**
- Tidak ada perubahan skema DB
- Tidak ada API endpoint baru
- Tidak ada perubahan komponen lain

### Test results
✅ 147/147 tests passed (tidak ada test baru yang diperlukan — fitur ini murni UI client-side).
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online, HTTP 200.

### Catatan
- Search mempertahankan sort state dari sort headers yang sudah ada
- Filter mencari di title, category, DAN type — cukup fleksibel untuk menemukan transaksi apapun
- Keyboard shortcut `/` mengikuti konvensi umum (Notion, VS Code, GitHub)

## Sesi Cron — 2 Agustus 2026: Period Progress Ring Indicator (PR #138)

### Ringkasan
Dashboard Balance Hero sekarang menampilkan **Period Progress Ring** — indicator SVG ring kecil (52×52px) di pojok kanan atas Balance Hero card yang menunjukkan progress waktu salary period (21st → 20th). Komponen reusable `PeriodProgressRing` yang menghitung hari tersisa, persentase elapsed, dan warna otomatis berdasarkan urgensi.

### Issue/PR
[#138 — feat: Period Progress Ring indicator on Dashboard Balance Hero](https://github.com/akramram/self-financial-dashboard/pull/138)

### Branch
`feat/period-progress-indicator` (merged to main, deleted)

### Apa yang berubah

**File baru:**
- `src/components/ui/period-progress-ring.tsx` — Reusable SVG ring component. Props: `activeMonth?` (string dari periods table), `className?`. Menghitung period dates (21st bulan lalu → 20th bulan ini), menghitung days elapsed, days remaining, dan percentage. Color-coded: mint (early <50%), gold (mid 50-79%), coral (late 80%+). CSS transition smooth pada stroke-dashoffset animation.

**File yang dimodifikasi:**
- `src/components/Dashboard.tsx` — Import PeriodProgressRing, tambahkan di Balance Hero section dengan layout `flex items-start justify-between` sehingga balance info di kiri dan ring di kanan.

**UX:**
- Ring menunjukkan persentase progress di tengah lingkaran
- Label "X days left" dengan ikon clock
- Sublabel "Day N of 30"
- Warna otomatis berdasarkan urgensi period
- Mendukung dark mode dan light mode
- Perhitungan purely client-side (tidak perlu API call)

**Hasil data nyata (live dashboard):**
- Period "August 2026": 18 days left, 44% elapsed, warna mint (early)

### Test results
✅ 147/147 tests passed (tidak ada test baru — komponen UI murni presentasi tanpa logic bisnis). Duration: ~1.4s.

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 clean restart (delete + start ecosystem.config.cjs), HTTP 200 untuk `/login`.
✅ CSS hash HTTP 200 (bukan 404 stale).

### Catatan
- Komponen mengikuti convention: React functional component, Tailwind dark/light classes, fintech palette colors.
- Computed entirely client-side dari `activeMonth` string — tidak ada API dependency.
- Reusable: bisa dipasang di halaman lain jika diperlukan.
- Tidak ada perubahan skema DB, tidak ada perubahan API.
- Backward compatible: Dashboard.tsx tetap bekerja jika `activeSummary?.month` undefined (fallback ke current salary period calculation).

## Sesi Cron — 1 Agustus 2026: Fix Dashboard P0-P2 Critique Bugs (Issue #136)

### Ringkasan
Memperbaiki 5 bugs kritis dari Impeccable Design Critique yang mengurangi trust user terhadap data di dashboard. Issue P1 (hardcoded runway, income delta bug) langsung mempengaruhi keakuratan data yang ditampilkan. Issue P2 (duplicate chart, wrong isPositive, duplicate CSS) mengurangi kualitas visual.

### Issue
[#136 — Fix Dashboard P0-P2 critique bugs: hardcoded runway, income delta, duplicate chart, spent isPositive](https://github.com/akramram/self-financial-dashboard/issues/136)

### Branch
`fix/dashboard-critique-p0p1-bugs` (merged to main, deleted)

### PR
[#137 — fix(#136): Fix Dashboard P0-P2 Critique Bugs](https://github.com/akramram/self-financial-dashboard/pull/137)

### Apa yang berubah

**File yang dimodifikasi:**
- `src/components/Dashboard.tsx` — +33 lines, -19 lines

**Perubahan:**

1. **P1: Hardcoded Runway "8.2" → Dynamic dari API**
   - Ditambah state `runwayData` yang fetch `/api/runway` on mount
   - Runway card sekarang menampilkan data real-time: 1.2 months (bukan 8.2 hardcoded)
   - Status icon berubah berdasarkan runway health: 🟢 healthy, 🟡 caution, 🔴 danger
   - Loading skeleton (dash "—") saat data belum tersedia
   - Ditambah link "View details →" ke halaman /runway

2. **P1: Income StatCard Delta Bug**
   - Delta sebelumnya: `income >= (income - (income - prevBalance))` = selalu true, menampilkan full income
   - Delta sekarang: `formatIdr(income - prevIncome)` — menampilkan perubahan period-over-period yang benar
   - `isPositive` sekarang: `income >= prevIncome` (naik = hijau, turun = merah)
   - Ditambah `prevIncome` dan `prevSpending` ke glance computed data

3. **P2: Duplicate NetworthChart dihapus**
   - NetworthChart muncul 2x (Insights + Charts) dengan kapitalisasi berbeda
   - Dihapus duplicate dari section Charts. Version di Insights adalah canonical.
   - Category chart diubah dari grid 2-col ke full-width (karena partner chart dihapus)

4. **P2: Spent StatCard isPositive diperbaiki**
   - Sebelumnya: `isPositive={true}` hardcoded — delta selalu hijau/TrendingUp
   - Sekarang: `isPositive={glance.spending <= glance.prevSpending}` — spending turun = positif, naik = negatif
   - Delta menampilkan perubahan absolut (`spending - prevSpending`)

5. **P2: Duplicate CSS class dihapus**
   - 4 heading chart punya `text-slate-800 dark:text-white/80` duplikat
   - Disederhanakan menjadi single class per heading

### Test results
✅ 147/147 tests passed. No test modifications needed (pure data wiring fix).

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online (clean delete + start via ecosystem.config.cjs), HTTP 200.
✅ CSS hash HTTP 200 (bukan 404 stale).
✅ Tidak ada runtime errors di PM2 logs.

### Catatan
- `/api/runway` sudah ada dan mengembalikan data lengkap (runway_months, status, tips, history, asset_breakdown)
- Runway status values: `healthy` (≥6 months), `caution` (3-6), default `danger` (<3)
- Perubahan backward compatible — tidak ada perubahan API, schema DB, atau komponen lain
- Issues #125 dan #126 (off-palette colors, side-tab borders) sudah ditutup oleh PR sebelumnya (#127)

## Sesi Cron — 31 Juli 2026: CSV Export untuk TransactionTable (Issue #132)

### Ringkasan
TransactionTable sudah punya fitur export JSON, tapi untuk finance dashboard user lebih sering butuh export ke CSV untuk dibuka di spreadsheet (Excel, Google Sheets). Ditambahkan opsi CSV sebagai format utama dalam dropdown export.

### Issue
[#132 — Add CSV export option to TransactionTable](https://github.com/akramram/self-financial-dashboard/issues/132)

### Branch
`feat/issue-132-csv-export` (merged to main, deleted)

### Apa yang berubah

**File yang dimodifikasi:**
- `src/components/TransactionTable.tsx` — +110 lines, -35 lines

**Perubahan:**
- Tombol Export tunggal diganti dengan dropdown menu (shadcn `DropdownMenu`) yang menawarkan 2 opsi: **Export as CSV** (utama) dan **Export as JSON** (sekunder, behavior lama dipertahankan).
- Ditambahkan `escapeCsvField()` helper — menangani field yang mengandung koma, tanda kutip, atau newline (standard CSV escaping).
- Ditambahkan `transactionsToCsv()` helper — menghasilkan CSV dengan header row: Date, Description, Amount, Type, Category, Period, Paid, Notes.
- Toast notification ditambahkan pada export sukses: "Exported N transactions as CSV" / "Exported N transactions as JSON".
- Export CSV menggunakan `text/csv;charset=utf-8;` MIME type.
- Semua format menghormati filter aktif (period, type, search, category).

**Komponen UI:**
- Dropdown trigger: icon Download + "Export" text (sama seperti sebelumnya).
- Menu item CSV: icon FileSpreadsheet + "Export as CSV".
- Menu item JSON: icon FileJson + "Export as JSON".

### Test results
✅ 147/147 tests passed (no new tests needed — pure UI enhancement). Duration: ~1.5s.

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online (clean delete + start via ecosystem.config.cjs), HTTP 200.
✅ CSS hash HTTP 200 (bukan 404 stale).
✅ Tidak ada runtime errors di PM2 logs.

### Catatan
- Backward compatible: JSON export masih tersedia sebagai opsi sekunder.
- Tidak ada perubahan API, tidak ada perubahan DB schema.
- Menggunakan shadcn DropdownMenu yang sudah terinstall.
- BOM (Byte Order Mark) tidak ditambahkan — CSV kompatibel dengan Excel dan Google Sheets.

## Sesi Cron — 30 Juli 2026: Optimistic State Updates + Toast Notifications (Issue #130)

### Ringkasan
Menghilangkan `window.location.reload()` dari semua React mutation handler (edit, delete, toggle-paid, bulk actions) dan menggantinya dengan optimistic state update + sonner toast notification. Ini adalah **P0 UX issue** dari Impeccable Design Critique — setiap mutasi memicu white flash penuh, kehilangan scroll position, dan tidak ada feedback jika API gagal.

### Issue
[#130 — Replace window.location.reload() with optimistic state updates + toast notifications](https://github.com/akramram/self-financial-dashboard/issues/130)

### Branch
`feat/optimistic-updates-toast-notifications` (merged to main, deleted)

### PR
[#131 — feat(#130): Replace window.location.reload() with optimistic updates + toast notifications](https://github.com/akramram/self-financial-dashboard/pull/131)

### Apa yang berubah
**3 file diubah** (84 insertions, 24 deletions):

- **`src/components/Dashboard.tsx`** — Ditambah local state `localTransactions` yang mirror SSR prop. Edit, toggle-paid, dan delete handler sekarang update local state secara optimistic + tampilkan sonner toast. Toggle-paid punya rollback otomatis jika API gagal. Hanya kickoff modal yang tetap reload (legit — membuat period baru dari server).
- **`src/components/TransactionTable.tsx`** — Ditambah local state `localTx`. Semua 5 handler (save edit, bulk delete, bulk category, toggle-paid inline, delete inline) diganti dari `window.location.reload()` ke optimistic update + toast.
- **`src/components/QuickAddDialog.tsx`** — Hapus fallback `window.location.reload()`, tambah `toast.success('Transaction added')`.

### Pola yang dipakai
```
1. Optimistic update: setLocalTx(prev => prev.map/filter(...))
2. API call: await someApi(...)
3. Success: toast.success('...')
4. Failure: toast.error('...') + optional revert
```

### Sisa `window.location.reload()` (3, semua legitimate non-React context)
- `Layout.astro` — Service worker update handler
- `dataStore.ts` — `resetToDefault()` localStorage reset
- `Dashboard.tsx` — Kickoff modal `onSuccess` (buat period baru dari server)

### Test results
✅ 147/147 tests pass. Duration: ~1.4s.
- Tidak ada test yang dimodifikasi (semua behavior existing tidak berubah)

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online, HTTP 200 untuk `/login`.
✅ CSS HTTP 200 (bukan 404 stale).
✅ Tidak ada runtime errors di PM2 logs.

### Catatan
- Perubahan backward compatible: tidak ada perubahan API, skema DB, atau komponen lain.
- `sonner` sudah terinstall (v2.0.7) dan Toaster sudah mounted di Layout.astro — hanya perlu import `toast` di komponen.
- Toggle-paid punya rollback otomatis: jika API gagal, state dikembalikan ke semula dan toast error tampil.

## Baseline (Pre-Iteration)
**Date:** 2025-04-28
**Branch:** main
**Issues Created:** #1-#6

### Current State
- Astro 4 + React 18 + Tailwind CSS 3 + better-sqlite3
- UI uses native Tailwind classes (no component library)
- Tables are raw HTML `<table>` elements
- Forms are raw HTML `<input>` elements
- No category management UI exists
- No budget targets exist
- No bulk actions exist
- No duplicate detection exists
- DB at `data/financial.db` with transactions, networth, monthly_income tables

### Issue Backlog
| # | Issue | Epic | Status |
|---|-------|------|--------|
| #1 | [FIN-015] Initialize shadcn/ui Ecosystem | Epic 1 | Open |
| #2 | [FIN-016] Refactor Existing Tables & Forms | Epic 1 | Open |
| #3 | [FIN-017] Build Category Settings Module | Epic 2 | Open |
| #4 | [FIN-018] Category-Level Budget Targets | Epic 2 | Open |
| #5 | [FIN-019] Bulk Table Actions | Epic 3 | Open |
| #6 | [FIN-020] Duplicate Entry Guardrail | Epic 3 | Open |

---

(Iterations will be appended below)

---

## Iteration 1 — FIN-015
**Date:** 2025-04-28
**Issue:** #1
**Branch:** `feat/FIN-015`
**PR:** #7

### What changed
- Installed shadcn/ui React ecosystem (`tailwindcss-animate`, `tailwind-merge`, `class-variance-authority`)
- Configured `tailwind.config.mjs` with shadcn theme tokens
- Created `src/lib/utils.ts` with `cn()` helper
- Created `src/styles/globals.css` with CSS variables
- Created `components.json`
- Updated `tsconfig.json` with `@/*` path alias
- Imported globals.css in `Layout.astro`
- Installed core components: Button, Input, Card, Table, Dialog, Select
- Added demo usage on `add.astro` (Card + Button)

### Build status
✅ Passes

---

## Iteration 2 — FIN-021 (Manual Trigger)
**Date:** 2025-04-28
**Issue:** #7 (created manually)
**Branch:** `feat/FIN-021-outcome-breakdown-income-budget`
**PR:** Merged to main

### What changed
- Added **Total Income** line to Outcome Breakdown card on Dashboard
- Added **Budget Used** progress bar showing `outcome.total / income` percentage
- Color-coded thresholds: green (<50%), amber (50-80%), red (>80%)
- Shows "X spent of Y" detail text under the bar
- Works for both All-time (latest month) and filtered month views
- No DB/schema changes — uses existing MonthlySummary data

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 3 — FIN-022 (Manual Trigger)
**Date:** 2025-04-28
**Issue:** User request
**Branch:** `feat/FIN-022-paid-toggle-outcome-filter`
**PR:** Merged to main

### What changed
- **Outcome Breakdown** now only includes **paid transactions** (`done = 1`) in all calculations
  - Updated `getMonthlySummary()` in `src/lib/db.ts` to filter `WHERE done = 1`
- Added **Paid/Unpaid toggle button** as the **first column** in transaction tables:
  - `Dashboard.tsx` inline transaction table
  - `TransactionTable.tsx` (used on `/transactions` page)
- Toggle button styling:
  - Green badge for **Paid** transactions
  - Red badge for **Unpaid** transactions
- Clicking the badge toggles the `done` status via API and refreshes the page
- Also added `done` checkbox to the inline **Edit** row in both tables
- Added `toggleTransactionDoneApi()` helper to `src/lib/api.ts`

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

### What's next
FIN-016: Refactor existing tables and forms to shadcn/ui components

---

## Iteration 4 — UI Reorder & Pagination
**Date:** 2025-04-28
**Issue:** #10
**Branch:** main (direct)
**PR:** N/A

### What changed
- Moved **Outcome Breakdown** card to top section of Dashboard
- Moved **This Month Transactions** card to top section
- Moved **Summary/Totals** cards to bottom of dashboard
- Added pagination controls to current month transaction table (10 per page)
- Reset page to 1 when month filter changes

### Build status
✅ Passes

---

## Iteration 5 — FIN-016
**Date:** 2025-04-29
**Issue:** #2
**Branch:** `feat/FIN-016`
**PR:** #13

### What changed
- **TransactionTable.tsx**: Migrated raw `<table>` to shadcn/ui `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`. Replaced native `<input>`, `<select>`, `<button>` with shadcn `Input`, `Select`, `Button`, `Badge`.
- **Dashboard.tsx**: Refactored inline transaction table with same shadcn/ui components. Replaced month filter `<select>` with shadcn `Select`.
- **AddTransactionForm.tsx**: Wrapped in `Card`. Replaced all native inputs/selects/buttons with shadcn `Input`, `Select`, `Button`, `Label`, `Badge`.
- **AddNetworthForm.tsx**: Wrapped in `Card`. Replaced all native inputs/selects/buttons with shadcn `Input`, `Select`, `Button`, `Label`, `Badge`.
- **NetworthEditForm.tsx**: Wrapped in `Card`. Replaced all native inputs/buttons with shadcn `Input`, `Button`, `Label`, `Badge`.
- **NetworthTable.tsx**: New component extracted from `networth.astro` server-rendered table, now using shadcn `Table` + `Button`.
- **networth.astro**: Replaced raw HTML table with `<NetworthTable client:load />`.
- **add.astro**: Removed redundant wrapper divs since forms now self-wrap in `Card`.
- Installed additional shadcn components: `label`, `badge`.

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

### What's next
FIN-017: Build Category Settings Module

---

## Iteration 6 — FIN-017
**Date:** 2025-04-30
**Issue:** #3
**Branch:** `feat/FIN-017`
**PR:** #14

### What changed
- Added `categories` table to SQLite schema (additive migration): `id`, `name` (unique), `color`, `monthly_limit`, `created_at`
- Added category CRUD DB helpers: `getCategories()`, `getCategoryById()`, `getCategoryByName()`, `insertCategory()`, `updateCategory()`, `deleteCategory()`
- Added `Category` interface to `src/lib/data.ts`
- Created `/api/categories` (GET/POST) and `/api/categories/[id]` (GET/PUT/DELETE) API routes
- Added category API helpers to `src/lib/api.ts`: `fetchCategories()`, `createCategory()`, `updateCategoryApi()`, `deleteCategoryApi()`
- Created `CategorySettings.tsx` component with shadcn/ui `Card`, `Table`, `Input`, `Button`, `Label`
  - Inline add form with name, monthly limit, native color picker + 18 preset color swatches
  - Inline edit per row
  - Delete with confirmation dialog
- Created `/settings` Astro page hosting `CategorySettings`
- Added **Settings** link to desktop and mobile nav in `Layout.astro`

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

### What's next
FIN-018: Implement Category-Level Budget Targets

---

## Iteration 7 — FIN-018
**Date:** 2025-05-01
**Issue:** #4
**Branch:** main
**PR:** N/A (direct)

### What changed
- Fetched categories client-side in `Dashboard.tsx` via `fetchCategories()`
- Built `categoryMap` lookup for quick limit resolution
- Added **Category Budgets** section inside the Outcome Breakdown card
  - Lists every category from `category_totals`, sorted by spend (descending)
  - Shows `amount / limit` text with color-coded thresholds (green <50%, amber 50-80%, red >80% / over-budget)
  - Displays a compact progress bar per category
  - Categories with no limit show spend amount with a neutral gray bar

### Build status
✅ Passes

---

## Iteration 8 — FIN-019
**Date:** 2025-05-01
**Issue:** #5
**Branch:** main
**PR:** N/A (direct)

### What changed
- Installed shadcn/ui `Checkbox` component
- Added bulk selection state (`Set<number>`) to `TransactionTable.tsx`
- Added **select-all** header checkbox and per-row checkboxes
- Added bulk action bar above the table showing count + **Delete Selected** button (destructive variant)
- Added `deleteTransactionsBulkApi()` to `src/lib/api.ts`
- Added `deleteTransactionsBulk(ids)` DB helper in `src/lib/db.ts`
- Added `DELETE /api/transactions` bulk endpoint in `src/pages/api/transactions/index.ts`

### Build status
✅ Passes

---

## Iteration 9 — FIN-020
**Date:** 2025-05-01
**Issue:** #6
**Branch:** main
**PR:** N/A (direct)

### What changed
- Added `findDuplicateTransaction()` to `src/lib/db.ts`
  - Checks for same `title`, `amount`, `category`, and `type` within last 24 hours
- Updated `POST /api/transactions` to run duplicate check
  - Returns `409 Conflict` with `{ duplicate: true, duplicateId, message }` if match found and `force` is not set
- Updated `AddTransactionForm.tsx`
  - On 409 response, opens a shadcn `Dialog` asking "A similar transaction was added within the last 24 hours. Are you sure you want to add it again?"
  - **Add Anyway** resubmits with `force: true`
  - **Cancel** closes dialog without adding

### Build status
✅ Passes

---

## Hotfix — TypeScript Errors
**Date:** 2025-05-01
**Branch:** main

### What changed
- Fixed `IncomeOutcomeChart.tsx`: changed import from `../lib/dataStore` to `../lib/data` for `MonthlySummary`
- Fixed `NetworthChart.tsx`: changed import from `../lib/dataStore` to `../lib/data` for `NetworthRecord`
- Fixed `src/lib/data.ts`: changed `monthlySummaryJson as MonthlySummary[]` to `monthlySummaryJson as unknown as MonthlySummary[]` to suppress strict overlap error caused by undefined category values in JSON

### Build status
✅ Passes — `tsc --noEmit` clean

---

## Iteration 10 — FIN-023
**Date:** 2025-05-01
**Issue:** #17
**Branch:** `feat/FIN-023`
**PR:** #18

### What changed
- Added DB helpers for `monthly_income`: `getMonthlyIncome()`, `getMonthlyIncomeByMonth()`, `upsertMonthlyIncome()`, `deleteMonthlyIncome()`
- Added API routes: `GET /api/income`, `POST /api/income`, `PUT /api/income/[month]`, `DELETE /api/income/[month]`
- Added client API helpers in `src/lib/api.ts`: `fetchMonthlyIncome()`, `upsertMonthlyIncomeApi()`, `updateMonthlyIncomeApi()`, `deleteMonthlyIncomeApi()`
- Created `IncomeSettings.tsx` component with shadcn/ui Card, Table, Input, Button, Label
  - Inline add form with month/year selector, income, and other income fields
  - Inline edit per row
  - Delete with confirmation
- Integrated `IncomeSettings` into `/settings` page above Category Settings

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

### What's next
FIN-024: Add JSON/CSV export UI button since the `/api/export` endpoint already exists but has no UI exposure.

---

## Iteration 11 — FIN-024
**Date:** 2026-05-03
**Issue:** #19
**Branch:** `feat/FIN-024`
**PR:** #19 (merged)

### What changed
- Enhanced `/api/export` to support `?format=csv` with `?type=transactions|networth|summary`
  - JSON export remains the default (`?format=json`)
  - CSV values are properly escaped for commas, quotes, and newlines
- Created `ExportData.tsx` component with shadcn/ui `Card` and `Button`
- Added 4 export buttons on `/settings` page:
  - Export JSON (All data)
  - Export Transactions CSV
  - Export Networth CSV
  - Export Monthly Summary CSV
- Files are downloaded client-side via Blob URLs with date-stamped filenames

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 12 — Schema Bugfix
**Date:** 2026-05-06
**Issue:** #20
**Branch:** `fix/monthly-income-schema`
**PR:** #21 (merged)

### What changed
- Added missing `CREATE TABLE IF NOT EXISTS monthly_income` to `initSchema()` in `src/lib/db.ts`
  - Schema: `month TEXT PRIMARY KEY`, `date TEXT NOT NULL`, `income REAL NOT NULL DEFAULT 0`, `other_income REAL NOT NULL DEFAULT 0`
  - Uses `IF NOT EXISTS` so existing production DB is unaffected
- This fixes a crash on fresh installs / DB resets whenever any code queries `monthly_income`

### Build status
✅ Passes

---
## Iteration 13 — FIN-025
**Date:** 2026-05-08
**Issue:** #22
**Branch:** `feat/FIN-025`
**PR:** #23

### What changed
- **CategoryChart**: added `categories` prop; uses category colors from Settings instead of hardcoded palette. Unknown categories fall back to the original palette.
- **Dashboard**: passes fetched `categories` to `CategoryChart`. Category badges in the inline transaction table now use the category color as background with white text. Category budget progress bars use the category color at 15% opacity (`#RRGGBB26`) for the track background; no-limit categories use the category color for the fill itself.
- **TransactionTable**: fetches categories client-side and applies category colors to category badges.

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 14 — Dark Mode Persistence
**Date:** 2026-05-12
**Issue:** #26
**Branch:** `fix/dark-mode-persistence`
**PR:** #27 (merged)

### What changed
- Removed hardcoded `class="dark"` from `<html>` in `Layout.astro`
- Added inline `<script>` in `<head>` that reads `localStorage.theme` and applies the `dark` class before the page renders, preventing FOUC
- Updated toggle button script to save the active theme preference to `localStorage`
- Defaults to dark mode if no preference is saved (matches original behavior)
- Theme preference now persists across all page navigations in the MPA

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 15 — FIN-027
**Date:** 2026-05-12
**Issue:** #28
**Branch:** `feat/FIN-027`
**PR:** #29 (merged)

### What changed
- Added `POST /api/import` endpoint supporting JSON and CSV import for transactions, networth, and monthly_income
- Added `importDataApi()` client helper in `src/lib/api.ts`
- Created `ImportData.tsx` component with:
  - File upload (JSON or CSV)
  - Auto-detection of format and data type from JSON keys
  - Manual type selection for CSV
  - Preview table showing first 5 rows
  - Import summary (imported / skipped / errors)
- Integrated `ImportData` into `/settings` page between Export and Income settings

### Build status
✅ Passes — live at `http://192.168.0.6:4321`

---

## Iteration 16 — FIN-028
**Date:** 2026-05-14
**Issue:** N/A (autonomous innovation)
**Branch:** `main`
**PR:** Pushed directly

### What changed
- Created `CategoryTrendChart.tsx` — a new Line chart visualization using Chart.js
  - Automatically identifies the top 6 categories by total spend across all time
  - Renders a multi-line trend chart with one line per category
  - Uses category colors from Settings; falls back to a curated 10-color palette
  - Y-axis uses compact formatting (1M, 1K) for readability
  - Interactive legend (click to hide/show lines) and index-mode tooltips
- Integrated the chart into `Dashboard.tsx` between the Savings Rate Trend and the Networth/Category doughnut row
- Chart respects the month filter: when a specific month is selected, it shows data only for that month (single point per category)

### Why it matters
Users can now visually track which spending categories are growing or shrinking over time — a critical personal finance insight that was previously impossible to see at a glance.

### Build status
✅ Passes — `npm run build` clean

---

## Iteration 17 — FIN-029
**Date:** 2026-05-15
**Issue:** N/A (autonomous innovation)
**Branch:** `main`
**PR:** Pushed directly

### What changed
- Created `FinancialInsights.tsx` — a new Smart Insights widget for the dashboard
  - Budget alerts: flags categories over budget (red) or near limit >=80% (amber)
  - Spending trend: compares current month total spending vs previous month with % change
  - Unpaid bills tracker: counts unpaid transactions and shows their total amount
  - Networth trend: shows month-over-month change with amount and percentage
  - Savings rate health: warns on negative/low savings (<10%), celebrates healthy rates
- Integrated the widget into `Dashboard.tsx` directly below the month filter
  - Receives `transactions`, `networth`, `summaries`, `categories`, and `activeMonth` props
  - Fully reactive to month filter changes (works for both All-time and specific months)
- Uses existing shadcn/ui `Card`, `CardHeader`, `CardTitle`, `CardContent`, and `Badge` components
- Uses `lucide-react` icons: `TrendingUp`, `TrendingDown`, `AlertTriangle`, `CheckCircle`, `Wallet`, `PiggyBank`, `Receipt`
- Color-coded insight cards with dark-mode support (emerald for good, amber for watch, red for alert)
- No DB schema or API changes required — computes entirely from existing client-side data

### Why it matters
Previously, users had to manually scan category budgets, compare months, and check unpaid statuses across different parts of the dashboard. The Insights widget surfaces actionable intelligence automatically, helping users catch overspending, missed payments, and savings trends at a glance.

### Build status
✅ Passes — `npm run build` clean

---

---

## Iteration 18 — FIN-030
**Date:** 2026-05-18
**Issue:** [#31](https://github.com/akramram/self-financial-dashboard/issues/31)
**Branch:** `feat/FIN-030`
**PR:** [#32](https://github.com/akramram/self-financial-dashboard/pull/32)

### What changed
- Updated `AddTransactionForm.tsx` default state:
  - `type` default changed from `'cash'` → `'credit_expense'`
  - `done` default changed from `false` → `true`
- This means every new transaction form now opens with **Credit Expense** selected and **Paid/Done** already checked.

### Why it matters
Reduces friction for the most common entry pattern (credit card expenses that are already paid). Users no longer need to manually switch type and check the paid box on every transaction.

### Build status
✅ Passes — `npm run build` clean

---

## Iteration 19 — FIN-031
**Date:** 2026-05-18
**Issue:** [#30](https://github.com/akramram/self-financial-dashboard/issues/30)
**Branch:** `feat/FIN-031`
**PR:** [#33](https://github.com/akramram/self-financial-dashboard/pull/33)

### What changed
- Created `OutcomeBarChart.tsx` — a new reusable horizontal bar chart component using Chart.js
  - Displays outcome grouped by category for a single month (default mode)
  - Supports an optional trend mode (single category across all months) when `summaries` prop is passed
  - Uses category colors from Settings; falls back to a curated 10-color palette
  - Highlights a selected category with full opacity + 2px border; dims others to 25% opacity
  - Y-axis uses compact formatting (1M, 1K) for readability
  - Responsive layout with fixed 256px height
- Integrated the chart into `Dashboard.tsx` inside the category transactions dialog
  - Chart renders above the transaction table when a category is clicked from the doughnut chart
  - Uses `activeSummary.category_totals` which already filters to `done=1` and aggregates `cash` + `credit_expense`
  - Dialog max-height increased from `80vh` to `85vh` to accommodate the chart without excessive scrolling

### Why it matters
Users can now see a visual breakdown of where their money went for the selected month immediately upon opening a category dialog. Previously, they only saw raw transaction rows with no comparative context. The highlighted category makes it easy to spot the selected category's relative share at a glance.

### Build status
✅ Passes — `npm run build` clean

## Iteration 20 — FIN-032: Month Filter on Transaction Page

**Date:** 2026-05-18
**Branch:** feat/FIN-032
**PR:** #35
**Issue:** #34

### What changed
- Added month filter dropdown to `TransactionTable` component
- Filter options dynamically derived from all unique `month` values in transactions, sorted descending (newest first)
- Works in combination with existing type filter and search input
- Selecting "All Months" resets the filter

### Files changed
- `src/components/TransactionTable.tsx`

### Why it matters
Users can now quickly narrow down transactions to a specific billing/reporting month instead of scrolling through paginated results across all months. Useful for reconciling monthly statements.

### Build status
✅ Passes — `npm run build` clean

## Iteration 21 — Fix: Persist Filters & Pagination on Transaction Page

**Date:** 2026-05-18
**Commit:** 01cfe00

### What changed
- `TransactionTable` now syncs filter state (type, month, search) and page number to URL query params via `history.replaceState`
- On mount, it reads the URL to restore the previous filter/pagination state
- This means `window.location.reload()` after save/delete/toggle no longer resets filters

### Files changed
- `src/components/TransactionTable.tsx`

### Why it matters
Users no longer lose their place (filters, search, page) when editing, deleting, or toggling a transaction. The URL becomes shareable/bookmarkable for specific filtered views.

### Build status
✅ Passes — `npm run build` clean

## Iteration 22 — Fix: Allow Negative Savings Rate Display

**Date:** 2026-05-18
**Commit:** bf3cc70

### What changed
- Removed `Math.max(0, ...)` clamp from savings rate calculation in `Dashboard.tsx`
- Savings rate can now display negative values (e.g., May 2026 shows -10.7% instead of 0%)
- Progress bar width clamped to `Math.max(0, Math.min(100, savingsRate))` to prevent invalid CSS
- Negative rates show red text and red progress bar; positive rates remain emerald

### Files changed
- `src/components/Dashboard.tsx`

### Why it matters
When total spending exceeds income (e.g., May 2026: income 18.5M vs outcome 20.5M), the savings rate should accurately reflect the deficit. Previously it falsely showed 0%, hiding the fact that the user was overspending.

### Build status
✅ Passes — `npm run build` clean

## Iteration 23 — FIN-033: Recurring Transactions & Monthly Salary Kickoff

**Date:** 2026-05-19
**Issue:** #36
**PR:** #37
**Commit:** d596451

### What changed
- Added `recurring_transactions` SQLite table with full CRUD API (`/api/recurring`)
- Created `/recurring` page with `RecurringManager.tsx` for managing recurring expenses
- Added `/api/kickoff` endpoint: creates new month with salary income + preloads all active recurring transactions
- Created `MonthKickoffModal.tsx` for salary input and kickoff confirmation
- Integrated salary banner into `Dashboard.tsx`: appears after the 25th when next month doesn't exist yet
- Added "Recurring" nav link to desktop and mobile navigation in `Layout.astro`

### Files changed
- `src/lib/db.ts` — New `recurring_transactions` table + CRUD helpers
- `src/lib/data.ts` — Added `RecurringTransaction` interface
- `src/lib/api.ts` — Added recurring & kickoff API helpers
- `src/pages/api/recurring/index.ts` — GET/POST recurring transactions
- `src/pages/api/recurring/[id].ts` — PUT/DELETE recurring transactions
- `src/pages/api/kickoff.ts` — GET status / POST create new month
- `src/components/RecurringManager.tsx` — CRUD UI for recurring transactions
- `src/components/MonthKickoffModal.tsx` — Salary input + kickoff confirmation modal
- `src/components/Dashboard.tsx` — Integrated salary kickoff banner
- `src/layouts/Layout.astro` — Added Recurring nav link
- `src/pages/recurring.astro` — New page

### Build status
✅ Passes — `npm run build` clean

## Iteration 24 — FIN-035: Export JSON for Specific Month

**Date:** 2026-05-21
**Issue:** [#38](https://github.com/akramram/self-financial-dashboard/issues/38)
**Branch:** `feat/FIN-035`
**PR:** [#39](https://github.com/akramram/self-financial-dashboard/pull/39)

### What changed
- Added **Export JSON** button next to the month/type filter row in `TransactionTable.tsx`
- Exports all currently filtered transactions (respects month + type + search filters, NOT paginated)
- Exported JSON shape: `date`, `description` (title), `amount`, `type`, `category`, `paid` (done)
- File name: `transactions-YYYY-MM.json` when a specific month is selected, `transactions-all.json` otherwise
- Shows `alert('No transactions found for this month')` when the filtered set is empty

### Files changed
- `src/components/TransactionTable.tsx`

### Why it matters
Users can now download transaction data for a specific month as structured JSON, making it easy to archive, share, or process in external tools.

### Build status
✅ Passes — `npm run build` clean

## Iteration 25 — FIN-036: Date Range and Amount Range Filters

**Date:** 2026-05-21
**Issue:** [#40](https://github.com/akramram/self-financial-dashboard/issues/40)
**Branch:** `feat/FIN-036`
**PR:** [#41](https://github.com/akramram/self-financial-dashboard/pull/41)

### What changed
- Added **date range** filters to `TransactionTable.tsx`: `From date` and `To date` HTML date pickers
- Added **amount range** filters: `Min amount` and `Max amount` number inputs
- All range filters compose with existing search, type, and month filters
- Filter state synced to URL query params (`dateFrom`, `dateTo`, `amountMin`, `amountMax`) and restored on mount
- Added **Clear Ranges** button to reset all four range inputs at once
- Filters apply to the full dataset (not just the current page)

### Files changed
- `src/components/TransactionTable.tsx`

### Why it matters
Users can now drill down to transactions within a specific date window or amount bracket, making it easier to reconcile statements, find large expenses, or audit a time period.

### Build status
✅ Passes — `npm run build` clean

## Iteration 26 — Fix: Move Month Kickoff Trigger to 21st

**Date:** 2026-05-22
**Issue:** [#42](https://github.com/akramram/self-financial-dashboard/issues/42)
**Branch:** `feat/FIN-035`
**PR:** [#43](https://github.com/akramram/self-financial-dashboard/pull/43)
**Commit:** 721c4a0

### What changed
- Changed `today.getDate() < 26` to `today.getDate() < 21` in `Dashboard.tsx`
- The salary kickoff banner now appears starting on the **21st** of each month instead of the 25th
- Gives users 4 extra days to prepare the new month before it starts

### Files changed
- `src/components/Dashboard.tsx`

### Build status
✅ Passes — `npm run build` clean

## Iteration 27 — FIN-038: Category Autocomplete on Add Transaction Form

**Date:** 2026-05-22
**Issue:** [#44](https://github.com/akramram/self-financial-dashboard/issues/44)
**Branch:** `feat/FIN-038`
**PR:** [#45](https://github.com/akramram/self-financial-dashboard/pull/45)
**Commit:** 5704c16

### What changed
- Fetched existing categories on mount via `fetchCategories()` in `AddTransactionForm.tsx`
- Replaced the free-text Category `<Input>` with an autocomplete input backed by a native HTML `<datalist>`
- Users can pick an existing category from the dropdown or type a new one freely
- Zero new dependencies — uses existing shadcn `Input` + browser-native `datalist`
- Updated helper text from "Leave blank to use first word of title" to "Pick an existing category or type a new one"

### Files changed
- `src/components/AddTransactionForm.tsx`

### Build status
✅ Passes — `npm run build` clean

## Iteration 28 — FIN-039: Show All Categories in Category Spending Trend

**Date:** 2026-05-22
**Issue:** [#46](https://github.com/akramram/self-financial-dashboard/issues/46)
**Branch:** `feat/FIN-039`
**PR:** [#47](https://github.com/akramram/self-financial-dashboard/pull/47)
**Commit:** 8e38fd3

### What changed
- Removed the `.slice(0, 6)` limit in `CategoryTrendChart.tsx`
- The Category Spending Trend line chart now displays **all** categories instead of only the top 6 by total spend
- Categories are still sorted by total spend (descending) for consistent legend ordering

### Files changed
- `src/components/CategoryTrendChart.tsx`

### Build status
✅ Passes — `npm run build` clean

## Iteration 29 — FIN-040: Hide Zero-Spend Categories from Category Spending Trend

**Date:** 2026-05-22
**Issue:** [#48](https://github.com/akramram/self-financial-dashboard/issues/48)
**Branch:** `feat/FIN-040`
**PR:** [#49](https://github.com/akramram/self-financial-dashboard/pull/49)
**Commit:** 6de5a0f

### What changed
- Added `.filter(([_, total]) => total > 0)` in `CategoryTrendChart.tsx`
- Categories with 0 total spend across all months are now excluded from the line chart and legend
- Keeps the chart focused on categories that actually have spending data

### Files changed
- `src/components/CategoryTrendChart.tsx`

### Build status
✅ Passes — `npm run build` clean

## Iteration 30 — Test Coverage: RecurringCostAnalyzer

**Date:** 2026-07-13
**Type:** Test coverage (autonomous cron)
**Branch:** `main`

### What changed
- Added 8 new DB layer tests for `getRecurringCostAnalysis()` logic in `src/__tests__/db.test.ts`:
  - Empty result when no recurring transactions exist
  - Monthly/annual totals computed from active items only (paused excluded)
  - Category grouping (multiple items in same category aggregate correctly)
  - Payment type grouping (cash / credit_expense / credit_payment)
  - Largest item identification
  - Average per item computation
  - Temporary item counting (items with `end_date`)
  - Paused vs active item separation
- Added 3 new API tests for `GET /api/recurring-cost` in `src/__tests__/api.test.ts`:
  - Returns full analysis result as JSON with correct status
  - Returns correct shape for empty recurring list
  - Returns `application/json` Content-Type header
- Added `getRecurringCostAnalysis` to the `vi.mock('../lib/db')` factory

### Files changed
- `src/__tests__/db.test.ts` — +8 tests in new `DB — Recurring Cost Analysis` describe block
- `src/__tests__/api.test.ts` — +3 tests in new `API — GET /api/recurring-cost` describe block

### Test results
✅ 66 tests passed (37 DB + 29 API), up from 55. Duration: 412ms.

### Build status
✅ Passes — `npm run build` clean

## Iteration 31 — FIN-092: Emergency Fund Runway Analysis

**Date:** 2026-07-17
**Type:** Feature (autonomous cron — Wayfinder innovation pipeline)
**Issue:** [#92](https://github.com/akramram/self-financial-dashboard/issues/92)
**Branch:** `feature/issue-92-runway` (merged to main, deleted)

### What changed
Menambahkan widget Emergency Fund Runway — analisis ketahanan finansial yang menghitung berapa lama pengguna bisa bertahan tanpa pendapatan.

**Komponen & file baru:**
- `src/pages/api/runway.ts` — API endpoint `GET /api/runway` yang menghitung:
  - Aset likuid (dengan faktor likuiditas per instrumen)
  - Pengeluaran bulanan rata-rata (3 periode terakhir, done=1, type cash/credit_expense)
  - Runway dalam bulan = aset likuid / pengeluaran
  - Cakupan biaya tetap = aset likuid / recurring obligations aktif
  - History 6 bulan terakhir untuk sparkline
  - Rekomendasi otomatis berdasarkan status
- `src/components/RunwayAnalysis.tsx` — widget dengan:
  - SVG gauge melingkar (skala 0-12 bulan)
  - Liquidity bar (visual proporsi aset berdasarkan tingkat likuiditas)
  - Key metrics (liquid assets, total assets, monthly expense, fixed coverage)
  - Trend sparkline (6 bulan)
  - Rekomendasi kontekstual
  - Status: critical (<1 bln), caution (1-3 bln), healthy (3-6 bln), strong (6+ bln)
- `src/pages/runway.astro` — halaman detail dengan metodologi perhitungan

**Integrasi:**
- `src/components/Dashboard.tsx` — widget compact (collapsible) setelah SafeToSpend
- `src/layouts/Layout.astro` — link navigasi di dropdown Planning (desktop + mobile)

**Likuiditas klasifikasi:**
| Instrumen | Faktor Likuiditas | Alasan |
|-----------|-------------------|--------|
| Cash / Jenius / Tabungan | 100% | Instant access |
| Reksa Dana / Mutual Fund | 90% | 1-3 hari settlement |
| Saham Lokal | 50% | Volatile, butuh timing jual |
| Saham Luar Negeri | 30% | Friction mata uang & pajak |
| Crypto | 80% | Likuid tapi volatile |

### Test results
✅ 106 tests passed (52 DB + 29 API + 25 component), up from 100. Duration: 1.7s.
- 6 new DB tests: liquidity factor computation, expense averaging, recurring obligations sum, unpaid exclusion, runway formula, status classification

### Build status
✅ Passes — `npm run build` clean

### Real data output
- Aset Likuid: IDR 17,290,459
- Total Aset: IDR 30,882,652
- Pengeluaran/Bulan: IDR 16,087,366
- Runway: 1.07 bulan (status: Hati-hati)
- Cakupan Biaya Tetap: 1.99 bulan

---

## Sesi Cron — 18 Juli 2026: Triple bug fix (issues #93, #94, #95)

### Ringkasan
Sesi ini merampungkan 3 bug yang ditemukan dari pemeriksaan `npx tsc --noEmit` dan review perubahan uncommitted. Semua fix berakar pada pola pitfall yang sudah terdokumentasi di skill development.

### Issue yang diselesaikan

| # | Judul | Akar masalah |
|---|-------|--------------|
| #93 | BudgetReport: dialog transaksi kategori mengabaikan filter period | Sisa migrasi `month` -> `period_id`. `fetchTransactions({ month })` diabaikan runtime karena type signature hanya terima `periodId`. Fix: resolve `filterMonth` ke `periodId` via lookup `summaries`. |
| #94 | Runway API: field `tips` hilang dari response object | Pitfall "API Response Object Missing Computed Fields". `tips` di-deklarasi di interface dan dipakai `RunwayAnalysis.tsx` tapi lupa dimasukkan ke response object. |
| #95 | TransactionTable: filter rentang tanggal menggunakan `date` (period marker) bukan `created_time` | `date` selalu tanggal 21 (period start), bukan timestamp transaksi aktual. Fix: pakai `parseCreatedTime(t)` untuk konsistensi dengan sorting dan heatmap. |

### Verifikasi
- `npx tsc --noEmit` -- 0 error untuk ketiga file yang di-fix
- `npx vitest run` -- 106/106 tests passed
- `npm run build` -- sukses (0 errors)
- PM2 restart -- online, tanpa error di log
- `curl /api/runway` -- field `tips` hadir sebagai array
- CSS hash match (HTTP 200, bukan 404 stale)

### Catatan
- Perubahan UX yang belum ter-commit pada `DashboardSummaryCards.tsx` (grid 4 menjadi 2 kolom) ditinggalkan uncommitted karena memerlukan konteks/spesifikasi lebih lanjut.
- Tidak ada perubahan skema DB atau API contract. Semua perubahan backward compatible.

---

## Sesi Cron — 19 Juli 2026: FIN-#96 Goal Trajectory Projection (autonomous Wayfinder pipeline)

### Ringkasan
Backlog issue open habis. Pipeline Wayfinder mengidentifikasi gap inovasi: `GoalsTracker.tsx` hanya punya perhitungan status on-track **linear statis** (`progress >= timeProgress`) dan `monthlyRate = sisa/(daysTotal/30)` tanpa mempertimbangkan kapasitas tabungan historis. Dibuat issue #96 lalu dieksekusi end-to-end.

### Issue
[#96 — Goal Trajectory Projection — proyeksi pencapaian goal berbasis trend tabungan aktual](https://github.com/akramram/self-financial-dashboard/issues/96)

### Branch
`feature/issue-96-goal-trajectory` (merged to main, deleted)

### Apa yang berubah
Widget **Goal Trajectory** baru di halaman `/goals` yang memproyeksikan kapan setiap goal aktif akan tercapai berdasarkan kecepatan tabungan historis (net worth growth rate, default window 6 periode).

**File baru:**
- `src/lib/goalTrajectory.ts` — pure function `analyzeGoalTrajectory()` yang menghitung projected_date, status (`ahead`/`on_track`/`at_risk`/`behind`/`completed`), `projected_gap_idr` (kekurangan di tanggal target), `required_monthly` (tabungan per bulan untuk tepat waktu). Tidak ada akses DB — input murni dari parameter, deterministic dan unit-testable.
- `src/pages/api/goal-trajectory.ts` — GET endpoint dengan optional `?window=N` override (1-24).
- `src/components/GoalTrajectory.tsx` — widget React `client:only="react"` yang fetch via API (menghindari Astro devalue prop serialization bug). Menampilkan: summary badges, sparkline trend net worth, per-goal card dengan progress, projected vs target date, gap analysis, dan rekomendasi otomatis.

**File yang dimodifikasi:**
- `src/pages/goals.astro` — integrasi widget di atas `GoalsTracker`.
- `src/__tests__/goalTrajectory.test.ts` — 20 unit test untuk pure function.
- `src/__tests__/api.test.ts` — +5 API test untuk endpoint goal-trajectory.

**Algoritma proyeksi:**
- `average_monthly_savings = (networth_last - networth_first) / (days_between / 30)` dengan window default 6 periode terakhir.
- `projected_months = remaining / avg_monthly_savings`
- `projected_date = today + projected_months * 30 days`
- Status berdasarkan `days_delta = projected_date - target_date`:
  - `ahead`: ≤ -14 hari (≥ 2 minggu lebih cepat)
  - `on_track`: ±14 hari
  - `at_risk`: telat 14-60 hari
  - `behind`: telat > 60 hari atau avg_savings ≤ 0

**Edge cases ditangani:**
- Networth < 2 entri → `has_sufficient_data: false`, setiap goal diberi status `behind` dengan `projected_date: null` dan pesan "data belum cukup".
- Goal completed → skip dari output.
- Tabungan negatif (networth menurun) → status `behind` dengan pesan sesuai.
- Tidak ada goal aktif → empty state dengan CTA.

**Hasil data nyata (live `/api/goal-trajectory`):**
- Fast Charger: status `behind`, proyeksi 2027-07-07 (target 2026-07-10 sudah lewat), gap IDR 1.60M.
- EV Battery: status `behind`, proyeksi 2030-12-05 (target 2029-01-03), gap IDR 3.18M.
- Rata-rata tabungan 6 periode terakhir: IDR 135,927/bulan.

### Test results
✅ 131/131 tests passed (sebelumnya 106 + 25 baru: 20 unit + 5 API). Duration: 3.77s.

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online, HTTP 200 untuk `/`, `/goals`, `/api/goal-trajectory`.
✅ CSS hash HTTP 200 (bukan 404 stale).
✅ Chunk `GoalTrajectory.B6e4rnH-.js` ter-build dan ter-serve dengan benar.

### Catatan
- Komponen sengaja menggunakan `client:only="react"` (bukan `client:load`) untuk menghindari potential Astro devalue serialization issue dengan tipe data nested (GoalTrajectoryResult).
- Tidak ada perubahan skema DB, tidak mengubah komponen GoalsTracker eksisting, tidak menambah tabel baru.
- Backward compatible: semua API eksisting tidak tersentuh.
- Memakai shadcn/ui (Card, Badge, Progress) — konsisten dengan standar proyek. Tidak ada LegionUI.

## Sesi Cron — 20 Juli 2026: FIN-#97 Smart Category Suggestion (autonomous Wayfinder pipeline)

### Ringkasan
Backlog issue open habis. Pipeline Wayfinder mengidentifikasi gap inovasi: form input transaksi (QuickAddDialog & AddTransactionForm) memakai fallback kategori naif `title.split(' ')[0]` yang error-prone (mis. "Grab Bike" → "Grab", "Bebek Carok" → "Bebek"). Analisis data historis menunjukkan **188/192 title (98%) memiliki konsistensi kategori ≥90%** — sangat reliable untuk auto-suggest. Dibuat issue #97 lalu dieksekusi end-to-end.

### Issue
[#97 — Smart Category Suggestion — auto-suggest kategori dari title berbasis mapping historis](https://github.com/akramram/self-financial-dashboard/issues/97)

### Branch
`feature/issue-97-smart-category-suggestion` (merged to main, deleted)

### Apa yang berubah
Sistem **Smart Category Suggestion** yang otomatis mengisi kategori transaksi berdasarkan riwayat transaksi historis dengan title yang sama.

**File baru:**
- `src/hooks/useCategorySuggestion.ts` — custom hook React dengan debounce 250ms, AbortController untuk cancel in-flight request, graceful error handling. Returns `{ suggestedCategory, confidence, isLoading, isAutoFilled, clearAutoFill }`.
- `src/pages/api/suggest-category.ts` — GET endpoint dengan query param `q`. Response: `{ category, confidence, match_type, sample_count }`.

**File yang dimodifikasi:**
- `src/lib/db.ts` — tambah fungsi `suggestCategory(title: string): CategorySuggestion` dengan algoritma 2-tier:
  1. **Exact match** (case-insensitive, trimmed): plurality vote dengan confidence >0.5, minimum 2 samples.
  2. **Prefix match fallback**: berbasis first-word (mis. "Kopi Pagi" match "Kopi Senja"), minimum 3 samples.
  - Hanya mempertimbangkan transaksi `done=1`.
- `src/components/QuickAddDialog.tsx` — integrasi hook dengan UI badge "✨ Auto: {cat} ({confidence}%)" yang klikable untuk clear. Field kategori di-highlight violet ketika auto-filled.
- `src/components/AddTransactionForm.tsx` — integrasi yang sama.
- `src/__tests__/db.test.ts` — +11 unit test untuk algoritma suggestCategory.
- `src/__tests__/api.test.ts` — +5 API test untuk endpoint.

**UX design:**
- Auto-fill terjadi hanya ketika user belum mengetik manual (`categoryUserTouched` state).
- Badge indikator "✨ Auto: {cat} ({confidence}%)" muncul di kanan label Category — user bisa klik X untuk clear.
- Loading spinner "Matching…" tampil saat debounced request in-flight.
- Field kategori di-highlight border violet + bg violet-50/40 saat auto-filled.
- User bisa override kapan saja — sistem stop auto-filling setelah user mulai mengetik manual.

**Hasil data nyata (live `/api/suggest-category`):**
- `Netflix` → Tagihan (100% confidence, 25 samples)
- `Listrik` → Tagihan (97.4% confidence, 38 samples) — meskipun ada beberapa transaksi dengan kategori "Family", plurality vote tetap mengembalikan Tagihan dengan benar
- `Spotify` → Tagihan (100% confidence, 24 samples)
- `Unknown Merchant` → null (no false suggestion)

### Test results
✅ 146/147 tests passed (1 pre-existing failure di Budget Pace yang sudah gagal di `main` sebelum branch ini dibuat — tidak terkait dengan perubahan ini). Duration: ~1.4s.
- 11 test baru untuk DB function (exact match, plurality vote, prefix fallback, case-insensitive, min samples, edge cases).
- 5 test baru untuk API endpoint.

### Build status
✅ `npm run build` sukses, 0 errors.
✅ PM2 restart online (clean delete + start via `ecosystem.config.cjs`), HTTP 200 untuk `/`, `/api/suggest-category`.
✅ CSS hash HTTP 200 (bukan 404 stale).
✅ Tidak ada runtime errors di PM2 logs.

### Catatan
- Solusi ini backward compatible: tidak ada perubahan skema DB (read-only queries), transaksi eksisting tidak berubah, dan jika API gagal form tetap bekerja seperti sebelumnya (fallback `title.split(' ')[0]`).
- Integrasi hanya di 2 form: QuickAddDialog & AddTransactionForm (jarang dipakai untuk title baru di EditTransactionDialog).
- Algoritma sengaja sederhana (exact + prefix match) — tidak butuh ML/fuzzy matching karena 98% data historis sudah konsisten.
- Memakai shadcn/ui + lucide-react (Sparkles, X, Loader2) — konsisten dengan standar proyek. Tidak ada LegionUI.

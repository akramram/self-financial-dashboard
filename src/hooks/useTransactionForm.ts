import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createTransaction, fetchCategories } from '../lib/api';
import type { Category, Transaction } from '../lib/data';
import { getActivePeriod, periodForDate, parseQuickAmount } from '../lib/utils';
import { useCategorySuggestion } from '../hooks/useCategorySuggestion';
import { notifyDataChanged } from '../lib/dataSync';

export const TX_TYPE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_expense', label: 'Credit Expense' },
  { value: 'credit_payment', label: 'Credit Payment' },
] as const;

export type TransactionFormStatus = 'idle' | 'loading' | 'success' | 'error' | 'duplicate';

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const todayLocal = () => new Date().toLocaleDateString('en-CA');
export const nowLocal = () => new Date().toTimeString().slice(0, 5);
/** local date+time → ISO (server-side day grouping uses SUBSTR, so local date must survive) */
export const localToIso = (d: string, t: string) => new Date(`${d}T${t}:00`).toISOString();

interface UseTransactionFormOptions {
  /** Called after a successful insert (both normal and force-add) — close modal, refresh feed, etc. */
  onSaved?: (tx: { title: string; amount: number | null; forced?: boolean }) => void;
}

/**
 * Shared state + submit logic for the two add-transaction forms
 * (Dashboard bottom-sheet modal and the /add page form).
 *
 * Extracted from AddTransactionForm (KUR-17) so both entry points behave the
 * same: quick-amount parsing, category auto-suggest with manual-override
 * tracking, date→period snapping (21st→20th convention), duplicate 409 guard.
 */
export function useTransactionForm({ onSaved }: UseTransactionFormOptions = {}) {
  const { month: defaultMonth, year: defaultYear } = getActivePeriod();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [txDate, setTxDate] = useState('');
  const [txTime, setTxTime] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'cash' | 'credit_expense' | 'credit_payment'>('credit_expense');
  const [done, setDone] = useState(true);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TransactionFormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryUserTouched, setCategoryUserTouched] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  /** True once fields hold a real (non-default) date — used for "Just now" chip */
  const dateTouchedRef = useRef(false);

  // Smart category suggestion — debounced fetch based on title
  const { suggestedCategory, confidence, isLoading: suggestionLoading, isAutoFilled } =
    useCategorySuggestion(title);

  // Auto-fill category when suggestion arrives and user hasn't manually typed one
  useEffect(() => {
    if (!categoryUserTouched && suggestedCategory && suggestedCategory !== category) {
      setCategory(suggestedCategory);
    }
    if (!categoryUserTouched && !suggestedCategory && category && !title.trim()) {
      setCategory('');
    }
  }, [suggestedCategory, categoryUserTouched, category, title]);

  useEffect(() => {
    fetchCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  /** Initialize date fields to "now". Call when the form surface opens. */
  const initNow = useCallback(() => {
    setTxDate(todayLocal());
    setTxTime(nowLocal());
    dateTouchedRef.current = false;
  }, []);

  // Start every surface at "now" on mount — /add page shows today's date
  // preselected (legacy behavior); the modal re-inits on each open.
  useEffect(() => {
    initNow();
  }, [initNow]);

  // When the date changes, snap the period (month/year selects) to match —
  // day ≥ 21 belongs to next month's period (21st→20th convention).
  const handleDateChange = useCallback((d: string) => {
    setTxDate(d);
    dateTouchedRef.current = true;
    if (!d) return;
    const p = periodForDate(d);
    if (p) {
      setMonth(p.month);
      setYear(p.year);
    }
  }, []);

  const handleTimeChange = useCallback((t: string) => {
    setTxTime(t);
    dateTouchedRef.current = true;
  }, []);

  const parsedAmount = useMemo(() => parseQuickAmount(amount), [amount]);
  const isAmountValid = parsedAmount != null;
  const previewAmount = isAmountValid ? parsedAmount!.toLocaleString('id-ID') : '';

  /** True while the transaction still sits at the default "now" timestamp */
  const isJustNow = !dateTouchedRef.current;

  const buildPayload = useCallback((force = false) => {
    const monthName = `${month} ${year}`;
    const monthIdx = MONTH_OPTIONS.indexOf(month) + 1;
    const date = `${year}-${String(monthIdx).padStart(2, '0')}-21`;
    const payload: Record<string, unknown> = {
      month: monthName,
      date,
      title: title.trim(),
      category: (category || title.split(' ')[0]).trim(),
      amount: parsedAmount ?? 0,
      currency: 'IDR',
      type,
      payment_method: type === 'cash' ? 'Cash' : 'Credit',
      done,
      notes: notes.trim() || undefined,
      // Real timestamp from the picked date+time (defaults to now).
      created_time: localToIso(txDate || todayLocal(), txTime || nowLocal()),
    };
    if (force) payload.force = true;
    return payload;
  }, [month, year, title, category, parsedAmount, type, done, notes, txDate, txTime]);

  const resetContent = useCallback(() => {
    setTitle('');
    setCategory('');
    setAmount('');
    setNotes('');
    setType('credit_expense');
    setDone(true);
    setCategoryUserTouched(false);
    setErrorMsg('');
    setShowDuplicateDialog(false);
    setStatus('idle');
    initNow();
  }, [initNow]);

  const submitTransaction = useCallback(async (force = false) => {
    if (!title.trim() || parsedAmount == null) {
      setErrorMsg('Judul dan jumlah wajib diisi.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(force)),
      });
      if (res.status === 409) {
        setStatus('duplicate');
        setShowDuplicateDialog(true);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Gagal menambahkan transaksi.');
        setStatus('error');
        return;
      }
      setStatus('success');
      onSaved?.({ title: title.trim(), amount: parsedAmount, forced: force });
      notifyDataChanged('transactions');
    } catch {
      setErrorMsg('Koneksi gagal. Coba lagi.');
      setStatus('error');
    }
  }, [title, parsedAmount, buildPayload, onSaved]);

  /** "Add Anyway" from the duplicate-guard dialog */
  const confirmDuplicate = useCallback(() => {
    setShowDuplicateDialog(false);
    return submitTransaction(true);
  }, [submitTransaction]);

  return {
    // fields
    month, setMonth, year, setYear,
    txDate, txTime,
    title, setTitle, category, setCategory,
    amount, setAmount, type, setType, done, setDone, notes, setNotes,
    // derived
    parsedAmount, isAmountValid, previewAmount, isJustNow,
    categories,
    suggestedCategory, confidence, suggestionLoading, isAutoFilled,
    // status
    status, errorMsg, showDuplicateDialog, setShowDuplicateDialog,
    // actions
    initNow, handleDateChange, handleTimeChange,
    categoryUserTouched, setCategoryUserTouched, submitTransaction, confirmDuplicate, resetContent,
    // refs
    titleRef,
  };
}

export type TransactionFormController = ReturnType<typeof useTransactionForm>;
export type { Transaction, Category };

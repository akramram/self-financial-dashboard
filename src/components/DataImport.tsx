import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ClipboardPaste,
  Trash2,
  Download,
} from 'lucide-react';

// ---- CSV Parser ----
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        current.push(field.trim());
        if (current.some((f) => f !== '')) {
          lines.push(current);
        }
        current = [];
        field = '';
        if (ch === '\r') i++; // skip \n after \r
      } else if (ch === '\r') {
        current.push(field.trim());
        if (current.some((f) => f !== '')) {
          lines.push(current);
        }
        current = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  // Push final field and line
  current.push(field.trim());
  if (current.some((f) => f !== '')) {
    lines.push(current);
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0];
  const rows = lines.slice(1);
  return { headers, rows };
}

// ---- Type Definitions ----
const IMPORT_TYPES = [
  { value: 'transactions', label: 'Transactions' },
  { value: 'networth', label: 'Net Worth' },
  { value: 'monthly_income', label: 'Monthly Income' },
];

const TX_FIELD_MAP: Record<string, string> = {
  month: 'Month',
  date: 'Date',
  title: 'Title',
  category: 'Category',
  amount: 'Amount',
  type: 'Type',
  payment_method: 'Payment Method',
  done: 'Paid',
  notes: 'Notes',
};

const NW_FIELD_MAP: Record<string, string> = {
  month: 'Month',
  date: 'Date',
  total: 'Total',
  currency: 'Currency',
  month_over_month_change: 'MoM Change',
  month_over_month_pct: 'MoM %',
};

const MI_FIELD_MAP: Record<string, string> = {
  month: 'Month',
  date: 'Date',
  income: 'Income',
  other_income: 'Other Income',
};

function getFieldMap(type: string): Record<string, string> {
  if (type === 'transactions') return TX_FIELD_MAP;
  if (type === 'networth') return NW_FIELD_MAP;
  return MI_FIELD_MAP;
}

function getRequiredFields(type: string): string[] {
  if (type === 'transactions') return ['month', 'date', 'title', 'category', 'amount', 'type'];
  if (type === 'networth') return ['month', 'date', 'total'];
  return ['month', 'date', 'income'];
}

// ---- Component ----
type Step = 'select' | 'preview' | 'result';

interface ImportRow {
  index: number;
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

export default function DataImport() {
  const [step, setStep] = useState<Step>('select');
  const [importType, setImportType] = useState('transactions');
  const [method, setMethod] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [resultError, setResultError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonParseError, setJsonParseError] = useState('');

  const fieldMap = getFieldMap(importType);
  const requiredFields = getRequiredFields(importType);

  const resetState = () => {
    setFileName('');
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    setPreviewRows([]);
    setResult(null);
    setResultError('');
    setPasteText('');
    setJsonParseError('');
  };

  // ---- File Upload Handler ----
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resetState();
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;

      if (file.name.endsWith('.json')) {
        // JSON file
        try {
          const parsed = JSON.parse(text);
          const items = Array.isArray(parsed) ? parsed : parsed.transactions || parsed.data || [];

          if (items.length === 0) {
            setJsonParseError('No data found in JSON file.');
            return;
          }

          const keys = Object.keys(items[0]);
          // Auto-map fields
          const mapping: Record<string, string> = {};
          for (const key of keys) {
            if (fieldMap[key]) {
              mapping[key] = key;
            } else if (key.toLowerCase() === 'description' && fieldMap['title']) {
              mapping[key] = 'title';
            } else if (key.toLowerCase() === 'paid' || key.toLowerCase() === 'done') {
              mapping[key] = 'done';
            }
          }

          setCsvHeaders(keys);
          setCsvRows(items.map((item: any) => keys.map((k) => String(item[k] ?? ''))));
          setColumnMapping(mapping);
          autoPreview(items.map((item: any) => keys.map((k) => String(item[k] ?? ''))), keys, mapping);
        } catch {
          setJsonParseError('Invalid JSON file.');
          return;
        }
      } else {
        // CSV file
        const { headers, rows } = parseCSV(text);
        if (headers.length === 0) {
          setJsonParseError('Empty or invalid CSV file.');
          return;
        }

        // Auto-map columns
        const mapping: Record<string, string> = {};
        for (const h of headers) {
          const lower = h.toLowerCase().trim();
          if (fieldMap[lower]) {
            mapping[h] = lower;
          } else if (lower === 'description' || lower === 'desc' || lower === 'name' || lower === 'merchant') {
            mapping[h] = 'title';
          } else if (lower === 'paid' || lower === 'status' || lower === 'done') {
            mapping[h] = 'done';
          } else if (lower === 'value' || lower === 'price' || lower === 'total') {
            mapping[h] = 'amount';
          } else if (lower === 'payment' || lower === 'method') {
            mapping[h] = 'payment_method';
          } else if (lower === 'period' || lower === 'month_name') {
            mapping[h] = 'month';
          }
        }

        setCsvHeaders(headers);
        setCsvRows(rows);
        setColumnMapping(mapping);
        autoPreview(rows, headers, mapping);
      }
    };
    reader.readAsText(file);
  }, [importType, fieldMap]);

  // ---- Paste Handler ----
  const handlePasteParse = useCallback(() => {
    resetState();
    const text = pasteText.trim();
    if (!text) return;

    // Try JSON first
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : parsed.transactions || parsed.data || [];

        if (items.length === 0) {
          setJsonParseError('No array data found in pasted JSON.');
          return;
        }

        const keys = Object.keys(items[0]);
        const mapping: Record<string, string> = {};
        for (const key of keys) {
          if (fieldMap[key]) mapping[key] = key;
        }
        setCsvHeaders(keys);
        setCsvRows(items.map((item: any) => keys.map((k) => String(item[k] ?? ''))));
        setColumnMapping(mapping);
        setFileName('pasted-data.json');
        autoPreview(items.map((item: any) => keys.map((k) => String(item[k] ?? ''))), keys, mapping);
        return;
      } catch {
        // Not JSON, try CSV
      }
    }

    // Try CSV
    const { headers, rows } = parseCSV(text);
    if (headers.length === 0) {
      setJsonParseError('Could not parse input. Paste CSV or JSON data.');
      return;
    }

    const mapping: Record<string, string> = {};
    for (const h of headers) {
      const lower = h.toLowerCase().trim();
      if (fieldMap[lower]) mapping[h] = lower;
    }

    setCsvHeaders(headers);
    setCsvRows(rows);
    setColumnMapping(mapping);
    setFileName('pasted-data.csv');
    autoPreview(rows, headers, mapping);
  }, [pasteText, fieldMap]);

  // ---- Auto Preview ----
  function autoPreview(rows: string[][], headers: string[], mapping: Record<string, string>) {
    const preview: ImportRow[] = [];
    const reverseMapping: Record<string, string> = {};
    for (const [csvCol, field] of Object.entries(mapping)) {
      reverseMapping[field] = csvCol;
    }

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      const data: Record<string, string> = {};
      const errors: string[] = [];

      for (const field of Object.keys(fieldMap)) {
        const csvCol = reverseMapping[field];
        if (csvCol) {
          const colIdx = headers.indexOf(csvCol);
          data[field] = colIdx >= 0 ? (row[colIdx] ?? '') : '';
        } else {
          data[field] = '';
        }
      }

      // Validate required fields
      for (const req of requiredFields) {
        if (!data[req] || data[req].trim() === '') {
          errors.push(`Missing ${fieldMap[req] || req}`);
        }
      }

      // Validate type for transactions
      if (importType === 'transactions' && data.type) {
        const validTypes = ['cash', 'credit_expense', 'credit_payment'];
        if (!validTypes.includes(data.type.toLowerCase())) {
          errors.push(`Invalid type: "${data.type}"`);
        }
      }

      // Validate amount
      if (data.amount && isNaN(Number(data.amount))) {
        errors.push(`Invalid amount: "${data.amount}"`);
      }

      preview.push({ index: i, data, valid: errors.length === 0, errors });
    }

    setPreviewRows(preview);
    setStep('preview');
  }

  // ---- Regenerate Preview when mapping changes ----
  const regeneratePreview = useCallback(() => {
    if (csvRows.length > 0 && csvHeaders.length > 0) {
      autoPreview(csvRows, csvHeaders, columnMapping);
    }
  }, [csvRows, csvHeaders, columnMapping]);

  // Update column mapping
  const updateMapping = (csvCol: string, field: string) => {
    const newMapping = { ...columnMapping };
    // Remove this csvCol from any existing mapping
    for (const key of Object.keys(newMapping)) {
      if (newMapping[key] === field) delete newMapping[key];
    }
    if (field === '__none__') {
      delete newMapping[csvCol];
    } else {
      newMapping[csvCol] = field;
    }
    setColumnMapping(newMapping);
    // re-run preview
    const reverseMapping: Record<string, string> = {};
    for (const [c, f] of Object.entries(newMapping)) {
      reverseMapping[f] = c;
    }

    const preview: ImportRow[] = [];
    const rows = csvRows;
    const headers = csvHeaders;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      const data: Record<string, string> = {};
      const errors: string[] = [];

      for (const field of Object.keys(fieldMap)) {
        const csvCol = reverseMapping[field];
        if (csvCol) {
          const colIdx = headers.indexOf(csvCol);
          data[field] = colIdx >= 0 ? (row[colIdx] ?? '') : '';
        } else {
          data[field] = '';
        }
      }

      for (const req of requiredFields) {
        if (!data[req] || data[req].trim() === '') {
          errors.push(`Missing ${fieldMap[req] || req}`);
        }
      }

      if (importType === 'transactions' && data.type) {
        const validTypes = ['cash', 'credit_expense', 'credit_payment'];
        if (!validTypes.includes(data.type.toLowerCase())) {
          errors.push(`Invalid type: "${data.type}"`);
        }
      }

      if (data.amount && isNaN(Number(data.amount))) {
        errors.push(`Invalid amount: "${data.amount}"`);
      }

      preview.push({ index: i, data, valid: errors.length === 0, errors });
    }
    setPreviewRows(preview);
  };

  // ---- Import ----
  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    setResultError('');

    try {
      // Build rows from ALL csvRows using mapping
      const reverseMapping: Record<string, string> = {};
      for (const [csvCol, field] of Object.entries(columnMapping)) {
        reverseMapping[field] = csvCol;
      }

      const rows = csvRows.map((row) => {
        const data: Record<string, any> = {};
        for (const field of Object.keys(fieldMap)) {
          const csvCol = reverseMapping[field];
          if (csvCol) {
            const colIdx = csvHeaders.indexOf(csvCol);
            data[field] = colIdx >= 0 ? (row[colIdx] ?? '') : '';
          }
        }
        // Convert amount to number
        if (data.amount) data.amount = Number(data.amount);
        // Convert done to boolean
        if (data.done !== undefined) {
          const d = String(data.done).toLowerCase();
          data.done = d === 'true' || d === '1' || d === 'yes' || d === 'paid';
        }
        return data;
      }).filter((r) => {
        // Filter out rows missing required fields
        for (const req of requiredFields) {
          if (!r[req] && r[req] !== 0) return false;
        }
        return true;
      });

      if (rows.length === 0) {
        setResultError('No valid rows to import. Check required fields are mapped.');
        setImporting(false);
        return;
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, rows }),
      });

      const json = await res.json();
      if (!res.ok) {
        setResultError(json.error || 'Import failed');
      } else {
        setResult(json);
        setStep('result');
      }
    } catch (err: any) {
      setResultError(err.message || 'Network error');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = Object.keys(fieldMap);
    const sampleRow = headers.map((h) => {
      if (h === 'month') return 'June 2026';
      if (h === 'date') return '2026-06-21';
      if (h === 'title') return 'Coffee Shop';
      if (h === 'category') return 'Food';
      if (h === 'amount') return '50000';
      if (h === 'type') return 'cash';
      if (h === 'payment_method') return 'Cash';
      if (h === 'done') return 'true';
      if (h === 'notes') return '';
      if (h === 'currency') return 'IDR';
      if (h === 'total') return '50000000';
      if (h === 'income') return '15000000';
      if (h === 'other_income') return '0';
      if (h === 'month_over_month_change') return '2000000';
      if (h === 'month_over_month_pct') return '4.2';
      return '';
    });

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalRows = csvRows.length;
  const validCount = previewRows.filter((r) => r.valid).length;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step === 'select' ? 'default' : 'outline'}>1. Select</Badge>
        <ArrowRight className="w-3 h-3 text-slate-400" />
        <Badge variant={step === 'preview' ? 'default' : 'outline'}>2. Preview</Badge>
        <ArrowRight className="w-3 h-3 text-slate-400" />
        <Badge variant={step === 'result' ? 'default' : 'outline'}>3. Done</Badge>
      </div>

      {/* Step 1: Select import type and source */}
      {step === 'select' && (
        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-white/80">
              <Upload className="w-5 h-5" />
              Import Data
            </h3>
            <p className="text-white/50">
              Import transactions, net worth, or income data from CSV or JSON files.
            </p>
          {/* Import type */}
            <div className="grid gap-2">
              <Label>What are you importing?</Label>
              <Select value={importType} onValueChange={(v) => { setImportType(v); resetState(); }}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Method */}
            <div className="grid gap-2">
              <Label>How would you like to import?</Label>
              <div className="flex gap-3">
                <Button
                  variant={method === 'upload' ? 'default' : 'outline'}
                  onClick={() => { setMethod('upload'); resetState(); }}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </Button>
                <Button
                  variant={method === 'paste' ? 'default' : 'outline'}
                  onClick={() => { setMethod('paste'); resetState(); }}
                  className="gap-2"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Paste Data
                </Button>
              </div>
            </div>

            {/* File upload or paste */}
            {method === 'upload' ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Click to upload CSV or JSON file
                    </p>
                    <p className="text-xs text-slate-400 mt-1">.csv, .json supported</p>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                    <Download className="w-3.5 h-3.5" />
                    Download Template CSV
                  </Button>
                  <p className="text-xs text-slate-400">
                    Required: {requiredFields.map((f) => fieldMap[f]).join(', ')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="paste-data">Paste JSON or CSV data</Label>
                  <textarea
                    id="paste-data"
                    value={pasteText}
                    onChange={(e) => { setPasteText(e.target.value); setJsonParseError(''); }}
                    placeholder='Paste your CSV or JSON data here...&#10;&#10;CSV example:&#10;month,date,title,category,amount,type&#10;June 2026,2026-06-21,Coffee,Food,50000,cash&#10;&#10;JSON example:&#10;[{"month":"June 2026","date":"2026-06-21","title":"Coffee","category":"Food","amount":50000,"type":"cash"}]'
                    className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                  />
                  {jsonParseError && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {jsonParseError}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button onClick={handlePasteParse} disabled={!pasteText.trim()} className="gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Parse & Preview
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </Button>
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="glass-card p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900">
              <p className="font-medium mb-1">📋 Import Format</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  For <strong>transactions</strong>, required fields are: {requiredFields.map((f) => fieldMap[f]).join(', ')}.
                  The <strong>month</strong> field should be in "Month Year" format (e.g., "June 2026").
                  The <strong>type</strong> must be one of: cash, credit_expense, credit_payment.
                </p>
              </div>
          </div>
      )}

      {/* Step 2: Preview & Map Columns */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* File info */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {fileName.endsWith('.json') ? (
                    <FileJson className="w-4 h-4 text-amber-500" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  )}
                  <span className="font-medium">{fileName}</span>
                  <Badge variant="secondary">{totalRows} rows</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setStep('select'); resetState(); }}>
                    Back
                  </Button>
                </div>
              </div>
            </div>

          {/* Column Mapping */}
          <div className="glass-card p-5">
            <h3 className="text-base text-white/80">Map Columns</h3>
              <p className="text-white/50">
                Match CSV columns to {importType} fields. Required fields are marked with *.
              </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {csvHeaders.map((header) => (
                  <div key={header} className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 truncate" title={header}>
                      &quot;{header}&quot;
                    </span>
                    <Select
                      value={columnMapping[header] || '__none__'}
                      onValueChange={(v) => updateMapping(header, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Ignore" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Ignore —</SelectItem>
                        {Object.entries(fieldMap).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label} {requiredFields.includes(key) ? '*' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

          {/* Preview Table */}
          <div className="glass-card p-5">
            <h3 className="text-base flex items-center justify-between text-white/80">
                <span>Preview</span>
                <div className="flex items-center gap-2 text-sm font-normal">
                  <Badge variant={validCount === previewRows.length ? 'default' : 'destructive'}>
                    {validCount}/{previewRows.length} valid
                  </Badge>
                  <span className="text-xs text-slate-400">
                    Showing first {Math.min(totalRows, 10)} of {totalRows} rows
                  </span>
                </div>
              </h3>
            <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      {Object.entries(fieldMap).map(([key, label]) => (
                        <TableHead key={key} className="text-xs">
                          {label}
                          {requiredFields.includes(key) && (
                            <span className="text-red-400 ml-0.5">*</span>
                          )}
                        </TableHead>
                      ))}
                      <TableHead className="w-8">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row) => (
                      <TableRow key={row.index}>
                        <TableCell className="text-xs text-slate-400">{row.index + 1}</TableCell>
                        {Object.keys(fieldMap).map((field) => (
                          <TableCell key={field} className="text-xs max-w-[120px] truncate">
                            {row.data[field] || (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="relative group">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                {row.errors.join(', ')}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {previewRows.length === 0 && (
                <p className="text-center py-8 text-slate-400">No data to preview.</p>
              )}
            </div>

          {/* Import button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {validCount === 0 ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  No valid rows — check required field mappings
                </span>
              ) : (
                <span>
                  {totalRows} rows total, {validCount} valid in sample
                </span>
              )}
            </p>
            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="gap-2"
              size="lg"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {totalRows} Rows
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && (
        <div className="glass-card p-5">
          <h3 className="flex items-center gap-2 text-white/80">
              {resultError ? (
                <XCircle className="w-6 h-6 text-red-500" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              )}
              {resultError ? 'Import Failed' : 'Import Complete'}
            </h3>
          {resultError ? (
              <p className="text-red-600 dark:text-red-400">{resultError}</p>
            ) : result && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{result.imported}</p>
                  <p className="text-xs text-slate-500 mt-1">Imported</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{result.skipped}</p>
                  <p className="text-xs text-slate-500 mt-1">Skipped</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-200 dark:border-red-800">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{result.errors}</p>
                  <p className="text-xs text-slate-500 mt-1">Errors</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={() => { setStep('select'); resetState(); }} variant="outline">
                Import More
              </Button>
              <Button asChild>
                <a href="/transactions">View Transactions</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/">Back to Dashboard</a>
              </Button>
            </div>
          </div>
      )}
    </div>
  );
}

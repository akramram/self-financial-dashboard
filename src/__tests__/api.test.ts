import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * API endpoint tests — unit-test route handlers by mocking db.ts functions.
 * Uses correct import paths from src/__tests__/ → src/pages/api/ and src/lib/db.
 */

// ─── Mock db.ts before importing route handlers ─────────────────────────────

const mockGetTransactions = vi.fn();
const mockInsertTransaction = vi.fn();
const mockUpdateTransactionsBulk = vi.fn();
const mockDeleteTransactionsBulk = vi.fn();
const mockFindDuplicateTransaction = vi.fn();
const mockEnsurePeriod = vi.fn();
const mockGetPeriodByMonth = vi.fn();
const mockGetTransactionById = vi.fn();
const mockUpdateTransaction = vi.fn();
const mockDeleteTransaction = vi.fn();
const mockGetCategories = vi.fn();
const mockInsertCategory = vi.fn();
const mockGetCategoryByName = vi.fn();
const mockGetNetworth = vi.fn();
const mockUpsertNetworth = vi.fn();
const mockRecalcNetworthMoM = vi.fn();
const mockGetGoals = vi.fn();
const mockInsertGoal = vi.fn();
const mockGetRecurringCostAnalysis = vi.fn();
const mockSuggestCategory = vi.fn();

vi.mock('../lib/db', () => ({
  db: {},
  getTransactions: mockGetTransactions,
  insertTransaction: mockInsertTransaction,
  updateTransactionsBulk: mockUpdateTransactionsBulk,
  deleteTransactionsBulk: mockDeleteTransactionsBulk,
  findDuplicateTransaction: mockFindDuplicateTransaction,
  ensurePeriod: mockEnsurePeriod,
  getPeriodByMonth: mockGetPeriodByMonth,
  getTransactionById: mockGetTransactionById,
  updateTransaction: mockUpdateTransaction,
  deleteTransaction: mockDeleteTransaction,
  getCategories: mockGetCategories,
  insertCategory: mockInsertCategory,
  getCategoryByName: mockGetCategoryByName,
  getNetworth: mockGetNetworth,
  upsertNetworth: mockUpsertNetworth,
  recalcNetworthMoM: mockRecalcNetworthMoM,
  getGoals: mockGetGoals,
  insertGoal: mockInsertGoal,
  getRecurringCostAnalysis: mockGetRecurringCostAnalysis,
  suggestCategory: mockSuggestCategory,
}));

async function parseJson(res: Response) {
  return JSON.parse(await res.text());
}

function makeRequest(url: string, init?: RequestInit) {
  return new Request(new URL(url, 'http://localhost:4321'), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

// ─── Transactions API ───────────────────────────────────────────────────────

describe('API — GET /api/transactions', () => {
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/transactions/index');
    GET = mod.GET;
  });

  it('returns transactions as JSON array', async () => {
    mockGetTransactions.mockReturnValue([{ id: 1, title: 'Test' }]);
    const res = await GET({ request: makeRequest('/api/transactions') });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toEqual([{ id: 1, title: 'Test' }]);
    expect(mockGetTransactions).toHaveBeenCalledWith({});
  });

  it('passes period_id filter', async () => {
    mockGetTransactions.mockReturnValue([]);
    await GET({ request: makeRequest('/api/transactions?period_id=5') });
    expect(mockGetTransactions).toHaveBeenCalledWith({ periodId: 5, type: undefined, search: undefined, category: undefined });
  });

  it('passes month filter and resolves period', async () => {
    mockGetPeriodByMonth.mockReturnValue({ id: 10 });
    mockGetTransactions.mockReturnValue([]);
    await GET({ request: makeRequest('/api/transactions?month=July+2026') });
    expect(mockGetPeriodByMonth).toHaveBeenCalledWith('July 2026');
    expect(mockGetTransactions).toHaveBeenCalledWith({ periodId: 10, type: undefined, search: undefined, category: undefined });
  });

  it('passes type and search filters', async () => {
    mockGetTransactions.mockReturnValue([]);
    await GET({ request: makeRequest('/api/transactions?type=cash&search=grab') });
    expect(mockGetTransactions).toHaveBeenCalledWith({ periodId: undefined, type: 'cash', search: 'grab', category: undefined });
  });
});

describe('API — POST /api/transactions', () => {
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/transactions/index');
    POST = mod.POST;
  });

  it('creates transaction and returns 201', async () => {
    mockFindDuplicateTransaction.mockReturnValue(null);
    mockInsertTransaction.mockReturnValue(42);

    const res = await POST({
      request: makeRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ period_id: 1, title: 'Grab', amount: 35000, category: 'Transport', type: 'cash', payment_method: 'GoPay' }),
      }),
    });

    expect(res.status).toBe(201);
    const body = await parseJson(res);
    expect(body.id).toBe(42);
    expect(mockInsertTransaction).toHaveBeenCalledTimes(1);
  });

  it('returns 409 for duplicate transaction', async () => {
    mockFindDuplicateTransaction.mockReturnValue(99);

    const res = await POST({
      request: makeRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ period_id: 1, title: 'Grab', amount: 35000, category: 'Transport', type: 'cash', payment_method: 'GoPay' }),
      }),
    });

    expect(res.status).toBe(409);
    const body = await parseJson(res);
    expect(body.duplicate).toBe(true);
    expect(body.duplicateId).toBe(99);
    expect(mockInsertTransaction).not.toHaveBeenCalled();
  });

  it('resolves period_id from month when period_id missing', async () => {
    mockFindDuplicateTransaction.mockReturnValue(null);
    mockEnsurePeriod.mockReturnValue(7);
    mockInsertTransaction.mockReturnValue(1);

    const res = await POST({
      request: makeRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ month: 'July 2026', title: 'Test', amount: 100, category: 'Food', type: 'cash', payment_method: 'Cash' }),
      }),
    });

    expect(res.status).toBe(201);
    expect(mockEnsurePeriod).toHaveBeenCalledWith('July 2026');
    expect(mockInsertTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ period_id: 7 })
    );
  });
});

describe('API — PUT /api/transactions (bulk update)', () => {
  let PUT: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/transactions/index');
    PUT = mod.PUT;
  });

  it('bulk updates transactions', async () => {
    mockUpdateTransactionsBulk.mockReturnValue({ changes: 2 });

    const res = await PUT({
      request: makeRequest('/api/transactions', {
        method: 'PUT',
        body: JSON.stringify({ ids: [1, 2], updates: { done: 1 } }),
      }),
    });

    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(body.updated).toBe(2);
  });

  it('returns 400 when ids is missing', async () => {
    const res = await PUT({
      request: makeRequest('/api/transactions', {
        method: 'PUT',
        body: JSON.stringify({ updates: { done: 1 } }),
      }),
    });

    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toBe('ids array required');
  });

  it('returns 400 when updates is missing', async () => {
    const res = await PUT({
      request: makeRequest('/api/transactions', {
        method: 'PUT',
        body: JSON.stringify({ ids: [1, 2] }),
      }),
    });

    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toBe('updates object required');
  });

  it('returns 400 when ids is empty array', async () => {
    const res = await PUT({
      request: makeRequest('/api/transactions', {
        method: 'PUT',
        body: JSON.stringify({ ids: [], updates: { done: 1 } }),
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe('API — DELETE /api/transactions (bulk delete)', () => {
  let DELETE: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/transactions/index');
    DELETE = mod.DELETE;
  });

  it('bulk deletes transactions', async () => {
    const res = await DELETE({
      request: makeRequest('/api/transactions', {
        method: 'DELETE',
        body: JSON.stringify({ ids: [1, 2, 3] }),
      }),
    });

    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(3);
    expect(mockDeleteTransactionsBulk).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('returns 400 when ids is missing', async () => {
    const res = await DELETE({
      request: makeRequest('/api/transactions', {
        method: 'DELETE',
        body: JSON.stringify({}),
      }),
    });

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/transactions/:id ──────────────────────────────────────────────

describe('API — GET /api/transactions/:id', () => {
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/transactions/[id]');
    GET = mod.GET;
  });

  it('returns 404 for non-existent transaction', async () => {
    mockGetTransactionById.mockReturnValue(undefined);
    const res = await GET({ params: { id: '999' } });
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body.error).toBe('Not found');
  });

  it('returns transaction for valid id', async () => {
    mockGetTransactionById.mockReturnValue({ id: 1, title: 'Test' });
    const res = await GET({ params: { id: '1' } });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.id).toBe(1);
  });
});

// ─── Categories API ──────────────────────────────────────────────────────────

describe('API — GET /api/categories', () => {
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/categories/index');
    GET = mod.GET;
  });

  it('returns categories as JSON array', async () => {
    mockGetCategories.mockReturnValue([{ id: 1, name: 'Food' }]);
    const res = await GET({});
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveLength(1);
  });
});

describe('API — POST /api/categories', () => {
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/categories/index');
    POST = mod.POST;
  });

  it('creates category and returns 201', async () => {
    mockGetCategoryByName.mockReturnValue(undefined);
    mockInsertCategory.mockReturnValue(1);

    const res = await POST({
      request: makeRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Food', color: '#ef4444', monthly_limit: 500000 }),
      }),
    });

    expect(res.status).toBe(201);
    const body = await parseJson(res);
    expect(body.id).toBe(1);
    expect(mockInsertCategory).toHaveBeenCalledWith({ name: 'Food', color: '#ef4444', monthly_limit: 500000 });
  });

  it('returns 400 for missing name', async () => {
    const res = await POST({
      request: makeRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ color: '#ef4444' }),
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate category', async () => {
    mockGetCategoryByName.mockReturnValue({ id: 1, name: 'Food' });

    const res = await POST({
      request: makeRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Food' }),
      }),
    });

    expect(res.status).toBe(409);
    const body = await parseJson(res);
    expect(body.error).toBe('Category already exists');
  });
});

// ─── Networth API ───────────────────────────────────────────────────────────

describe('API — GET /api/networth', () => {
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/networth/index');
    GET = mod.GET;
  });

  it('returns networth data as JSON array', async () => {
    mockGetNetworth.mockReturnValue([{ period_id: 1, total: 50000000 }]);
    const res = await GET({});
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveLength(1);
    expect(body[0].total).toBe(50000000);
  });
});

describe('API — POST /api/networth', () => {
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/networth/index');
    POST = mod.POST;
  });

  it('creates networth record with period_id', async () => {
    mockUpsertNetworth.mockReturnValue(undefined);
    mockRecalcNetworthMoM.mockReturnValue(undefined);

    const res = await POST({
      request: makeRequest('/api/networth', {
        method: 'POST',
        body: JSON.stringify({ period_id: 1, date: '2026-07-20', total: 50000000 }),
      }),
    });

    expect(res.status).toBe(201);
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(mockUpsertNetworth).toHaveBeenCalledTimes(1);
    expect(mockRecalcNetworthMoM).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when period_id and month are both missing', async () => {
    const res = await POST({
      request: makeRequest('/api/networth', {
        method: 'POST',
        body: JSON.stringify({ total: 50000000 }),
      }),
    });

    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toBe('period_id or month is required');
  });
});

// ─── Goals API ──────────────────────────────────────────────────────────────

describe('API — GET /api/goals', () => {
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/goals/index');
    GET = mod.GET;
  });

  it('returns goals as JSON array', async () => {
    mockGetGoals.mockReturnValue([{ id: 1, name: 'Emergency Fund' }]);
    const res = await GET({});
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body).toHaveLength(1);
  });
});

describe('API — POST /api/goals', () => {
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/goals/index');
    POST = mod.POST;
  });

  it('creates a goal and returns 201', async () => {
    mockInsertGoal.mockReturnValue(1);

    const res = await POST({
      request: makeRequest('/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Emergency Fund',
          target_amount: 50000000,
          start_date: '2026-01-01',
          target_date: '2026-12-31',
        }),
      }),
    });

    expect(res.status).toBe(201);
    const body = await parseJson(res);
    expect(body.id).toBe(1);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await POST({
      request: makeRequest('/api/goals', {
        method: 'POST',
        body: JSON.stringify({ name: 'No targets' }),
      }),
    });

    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toContain('required');
  });

  it('returns 500 for database errors', async () => {
    mockInsertGoal.mockImplementation(() => { throw new Error('UNIQUE constraint failed'); });

    const res = await POST({
      request: makeRequest('/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Dupe Goal',
          target_amount: 1000,
          start_date: '2026-01-01',
          target_date: '2026-12-31',
        }),
      }),
    });

    expect(res.status).toBe(500);
    const body = await parseJson(res);
    expect(body.error).toContain('UNIQUE constraint failed');
  });
});

// ─── Recurring Cost API ────────────────────────────────────────────────────

describe('API — GET /api/recurring-cost', () => {
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/recurring-cost');
    GET = mod.GET;
  });

  it('returns recurring cost analysis as JSON', async () => {
    const mockResult = {
      items: [],
      activeItems: [
        { id: 1, title: 'Netflix', category: 'Entertainment', amount: 186000, type: 'credit_expense', active: true, end_date: null, isTemporary: false },
      ],
      pausedItems: [],
      monthlyTotal: 186000,
      annualTotal: 186000 * 12,
      monthlyByCategory: { Entertainment: 186000 },
      monthlyByType: { cash: 0, credit_expense: 186000, credit_payment: 0 },
      categoryCount: 1,
      activeCount: 1,
      temporaryCount: 0,
      largestItem: { id: 1, title: 'Netflix', category: 'Entertainment', amount: 186000, type: 'credit_expense', active: true, end_date: null, isTemporary: false },
      avgPerItem: 186000,
    };
    mockGetRecurringCostAnalysis.mockReturnValue(mockResult);

    const res = await GET({ request: makeRequest('/api/recurring-cost') });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.activeCount).toBe(1);
    expect(body.monthlyTotal).toBe(186000);
    expect(body.annualTotal).toBe(2232000);
    expect(body.activeItems[0].title).toBe('Netflix');
    expect(mockGetRecurringCostAnalysis).toHaveBeenCalledTimes(1);
  });

  it('returns correct shape for empty recurring list', async () => {
    const emptyResult = {
      items: [], activeItems: [], pausedItems: [],
      monthlyTotal: 0, annualTotal: 0,
      monthlyByCategory: {}, monthlyByType: { cash: 0, credit_expense: 0, credit_payment: 0 },
      categoryCount: 0, activeCount: 0, temporaryCount: 0,
      largestItem: null, avgPerItem: 0,
    };
    mockGetRecurringCostAnalysis.mockReturnValue(emptyResult);

    const res = await GET({ request: makeRequest('/api/recurring-cost') });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.activeCount).toBe(0);
    expect(body.monthlyTotal).toBe(0);
    expect(body.largestItem).toBeNull();
  });

  it('returns correct Content-Type header', async () => {
    mockGetRecurringCostAnalysis.mockReturnValue({
      items: [], activeItems: [], pausedItems: [],
      monthlyTotal: 0, annualTotal: 0,
      monthlyByCategory: {}, monthlyByType: { cash: 0, credit_expense: 0, credit_payment: 0 },
      categoryCount: 0, activeCount: 0, temporaryCount: 0,
      largestItem: null, avgPerItem: 0,
    });

    const res = await GET({ request: makeRequest('/api/recurring-cost') });
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });
});

// ─── Goal Trajectory API ───────────────────────────────────────────────────

describe('API — GET /api/goal-trajectory', () => {
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/goal-trajectory');
    GET = mod.GET;
  });

  it('returns projection for active goals based on networth trend', async () => {
    mockGetGoals.mockReturnValue([
      {
        id: 1, name: 'Fast Charger', target_amount: 2_500_000, current_amount: 900_000,
        start_date: '2026-06-03', target_date: '2027-06-01',
        color: '#22c55e', icon: 'car', completed: 0,
      },
    ]);
    // +1M / month over 6 samples.
    const series = [];
    const baseMs = new Date('2026-01-21').getTime();
    for (let i = 0; i < 6; i++) {
      const date = new Date(baseMs + i * 30 * 86400 * 1000).toISOString().slice(0, 10);
      series.push({
        period_id: 100 + i, month: `Month ${i}`, date, total: 20_000_000 + i * 1_000_000,
        currency: 'IDR', month_over_month_change: null, month_over_month_pct: null, breakdown: {},
      });
    }
    mockGetNetworth.mockReturnValue(series);

    const res = await GET({ url: new URL('http://localhost:4321/api/goal-trajectory') });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.has_sufficient_data).toBe(true);
    expect(body.goals).toHaveLength(1);
    expect(body.goals[0].name).toBe('Fast Charger');
    expect(body.goals[0].monthly_savings).toBeGreaterThan(0);
    expect(body.goals[0].projected_date).toBeTruthy();
    // 1.6M remaining at 1M/mo → ~1.6 months. Plenty ahead of 1-year target.
    expect(body.goals[0].status).toBe('ahead');
    expect(body.trend).toHaveLength(6);
    expect(mockGetGoals).toHaveBeenCalledTimes(1);
    expect(mockGetNetworth).toHaveBeenCalledTimes(1);
  });

  it('flags insufficient data when networth has fewer than 2 samples', async () => {
    mockGetGoals.mockReturnValue([
      {
        id: 1, name: 'Test', target_amount: 1_000_000, current_amount: 0,
        start_date: '2026-01-01', target_date: '2027-01-01',
        color: '#3b82f6', icon: 'savings', completed: 0,
      },
    ]);
    mockGetNetworth.mockReturnValue([
      { period_id: 1, month: 'July 2026', date: '2026-07-21', total: 30_000_000, currency: 'IDR',
        month_over_month_change: null, month_over_month_pct: null, breakdown: {} },
    ]);

    const res = await GET({ url: new URL('http://localhost:4321/api/goal-trajectory') });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.has_sufficient_data).toBe(false);
    expect(body.goals[0].status).toBe('behind');
    expect(body.goals[0].projected_date).toBeNull();
  });

  it('drops completed goals from the projection output', async () => {
    mockGetGoals.mockReturnValue([
      {
        id: 1, name: 'Done Goal', target_amount: 1_000_000, current_amount: 1_000_000,
        start_date: '2025-01-01', target_date: '2026-01-01',
        color: '#22c55e', icon: 'savings', completed: 1,
      },
      {
        id: 2, name: 'Active Goal', target_amount: 2_000_000, current_amount: 500_000,
        start_date: '2026-01-01', target_date: '2027-01-01',
        color: '#3b82f6', icon: 'savings', completed: 0,
      },
    ]);
    const series = [];
    const baseMs = new Date('2026-01-21').getTime();
    for (let i = 0; i < 4; i++) {
      const date = new Date(baseMs + i * 30 * 86400 * 1000).toISOString().slice(0, 10);
      series.push({
        period_id: 100 + i, month: `Month ${i}`, date, total: 20_000_000 + i * 500_000,
        currency: 'IDR', month_over_month_change: null, month_over_month_pct: null, breakdown: {},
      });
    }
    mockGetNetworth.mockReturnValue(series);

    const res = await GET({ url: new URL('http://localhost:4321/api/goal-trajectory') });
    const body = await parseJson(res);
    expect(body.goals).toHaveLength(1);
    expect(body.goals[0].name).toBe('Active Goal');
  });

  it('returns application/json Content-Type', async () => {
    mockGetGoals.mockReturnValue([]);
    mockGetNetworth.mockReturnValue([]);
    const res = await GET({ url: new URL('http://localhost:4321/api/goal-trajectory') });
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('honors ?window= query param within 1..24', async () => {
    mockGetGoals.mockReturnValue([]);
    const series = [];
    const baseMs = new Date('2026-01-21').getTime();
    for (let i = 0; i < 12; i++) {
      const date = new Date(baseMs + i * 30 * 86400 * 1000).toISOString().slice(0, 10);
      series.push({
        period_id: 100 + i, month: `Month ${i}`, date, total: 10_000_000 + i * 1_000_000,
        currency: 'IDR', month_over_month_change: null, month_over_month_pct: null, breakdown: {},
      });
    }
    mockGetNetworth.mockReturnValue(series);
    const res = await GET({ url: new URL('http://localhost:4321/api/goal-trajectory?window=4') });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.trend).toHaveLength(4);
  });
});

// ─── GET /api/suggest-category ──────────────────────────────────────────────

describe('API — GET /api/suggest-category', () => {
  let GET: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../pages/api/suggest-category');
    GET = mod.GET;
  });

  it('returns 400 when q param is missing', async () => {
    const res = await GET({ request: makeRequest('/api/suggest-category') });
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toMatch(/q/i);
  });

  it('returns category suggestion for a known title', async () => {
    mockSuggestCategory.mockReturnValue({
      category: 'Makanan',
      confidence: 0.9,
      match_type: 'exact',
      sample_count: 10,
    });
    const res = await GET({
      request: makeRequest('/api/suggest-category?q=Ayam%20Bowo'),
    });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.category).toBe('Makanan');
    expect(body.confidence).toBeCloseTo(0.9, 5);
    expect(body.match_type).toBe('exact');
    expect(body.sample_count).toBe(10);
    expect(mockSuggestCategory).toHaveBeenCalledWith('Ayam Bowo');
  });

  it('returns null category when no reliable suggestion', async () => {
    mockSuggestCategory.mockReturnValue({
      category: null,
      confidence: 0,
      match_type: null,
      sample_count: 0,
    });
    const res = await GET({
      request: makeRequest('/api/suggest-category?q=CompletelyUnknown'),
    });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.category).toBeNull();
    expect(body.match_type).toBeNull();
    expect(body.sample_count).toBe(0);
  });

  it('trims whitespace from query before passing to suggestCategory', async () => {
    mockSuggestCategory.mockReturnValue({
      category: 'Tagihan',
      confidence: 1.0,
      match_type: 'exact',
      sample_count: 5,
    });
    const res = await GET({
      request: makeRequest('/api/suggest-category?q=%20%20Netflix%20%20'),
    });
    expect(res.status).toBe(200);
    expect(mockSuggestCategory).toHaveBeenCalledWith('Netflix');
  });

  it('returns empty suggestion for empty/whitespace-only q', async () => {
    const res = await GET({
      request: makeRequest('/api/suggest-category?q=%20%20%20'),
    });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.category).toBeNull();
    expect(body.match_type).toBeNull();
    expect(body.sample_count).toBe(0);
  });
});

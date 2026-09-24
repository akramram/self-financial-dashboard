/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/utils', () => ({
  formatIdr: (n: number) => `IDR ${n.toLocaleString('id-ID')}`,
  getActivePeriod: () => ({ month: 'October', year: 2026 }),
}));

const { fetchGoalsMock } = vi.hoisted(() => ({ fetchGoalsMock: vi.fn() }));
vi.mock('../lib/api', () => ({ fetchGoals: fetchGoalsMock }));

vi.mock('../lib/dataSync', () => ({
  onDataChanged: () => () => {},
}));

import GoalsSnapshot from '../components/GoalsSnapshot';
import type { FinancialGoal } from '../lib/api';

const mkGoal = (over: Partial<FinancialGoal>): FinancialGoal => ({
  id: 1,
  name: 'Test Goal',
  description: '',
  target_amount: 1000000,
  current_amount: 400000,
  start_date: '2026-08-01',
  target_date: '2026-12-31',
  color: '#22c55e',
  icon: 'car',
  completed: false,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...over,
});

describe('GoalsSnapshot', () => {
  beforeEach(() => {
    fetchGoalsMock.mockReset();
  });

  it('renders active goals with ring percentage and amounts', async () => {
    fetchGoalsMock.mockResolvedValue([
      mkGoal({ id: 2, name: 'Fast Charger', target_amount: 2500000, current_amount: 1505500 }),
      mkGoal({ id: 3, name: 'EV Battery', target_amount: 8000000, current_amount: 1139023 }),
    ]);
    render(<GoalsSnapshot />);
    await waitFor(() => expect(screen.getByText('Fast Charger')).toBeInTheDocument());
    expect(screen.getByText('EV Battery')).toBeInTheDocument();
    // 1505500/2500000 = 60%
    expect(screen.getByRole('img', { name: '60% complete' })).toBeInTheDocument();
    expect(screen.getByText(/IDR 1.505.500 \/ IDR 2.500.000/)).toBeInTheDocument();
    expect(screen.getAllByText(/est\. finish/).length).toBe(2);
  });

  it('shows empty state when no active goals', async () => {
    fetchGoalsMock.mockResolvedValue([mkGoal({ completed: true })]);
    render(<GoalsSnapshot />);
    await waitFor(() => expect(screen.getByText('No active goals yet')).toBeInTheDocument());
    expect(screen.getByText('Set one up →')).toBeInTheDocument();
  });

  it('caps at 3 goals and excludes completed', async () => {
    fetchGoalsMock.mockResolvedValue([
      mkGoal({ id: 1, name: 'A' }),
      mkGoal({ id: 2, name: 'B' }),
      mkGoal({ id: 3, name: 'C' }),
      mkGoal({ id: 4, name: 'D' }),
      mkGoal({ id: 5, name: 'Done', completed: true }),
    ]);
    render(<GoalsSnapshot />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('marks late ETA when projection passes target date', async () => {
    // 40k/month pace since Aug 2026 (~2 months) → 80k total; target 2M → ~48 months → Sep 2030, target Dec 2026 → late
    fetchGoalsMock.mockResolvedValue([
      mkGoal({ name: 'Slow Goal', target_amount: 2000000, current_amount: 80000, start_date: '2026-08-01', target_date: '2026-12-31' }),
    ]);
    render(<GoalsSnapshot />);
    await waitFor(() => expect(screen.getByText('Slow Goal')).toBeInTheDocument());
    expect(screen.getByText(/late/)).toBeInTheDocument();
  });
});

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import GoalPacePanel from '../components/GoalPacePanel';
import { analyzeGoalsPortfolio, type PortfolioAnalysis } from '../lib/goals-engine';
import type { GoalInput } from '../lib/goals-engine';

const TODAY = '2026-07-02';

function goal(overrides: Partial<GoalInput>): GoalInput {
  return {
    id: 1,
    name: 'Emergency Fund',
    target_amount: 12_000_000,
    current_amount: 2_000_000,
    start_date: '2026-01-01',
    target_date: '2026-12-31',
    completed: false,
    color: '#10b981',
    ...overrides,
  };
}

function buildAnalysis(): PortfolioAnalysis {
  const goals: GoalInput[] = [
    goal({ id: 1, name: 'Emergency Fund', current_amount: 9_000_000 }),
    goal({ id: 2, name: 'Umroh', target_amount: 24_000_000, current_amount: 2_000_000 }),
  ];
  return analyzeGoalsPortfolio(
    goals,
    new Map([
      [1, 1_500_000],
      [2, 0],
    ]),
    6_000_000,
    TODAY
  );
}

describe('GoalPacePanel', () => {
  it('render loading skeleton saat capacityLoading', () => {
    render(<GoalPacePanel analysis={null} capacityLoading today={TODAY} />);
    expect(screen.getByTestId('pace-panel-loading')).toBeInTheDocument();
  });

  it('render empty state tanpa goal aktif', () => {
    render(<GoalPacePanel analysis={null} capacityLoading={false} today={TODAY} />);
    expect(screen.getByTestId('pace-panel-empty')).toBeInTheDocument();
  });

  it('render KPI on-track, badge kelayakan, dan baris pace per goal', () => {
    const analysis = buildAnalysis();
    render(<GoalPacePanel analysis={analysis} capacityLoading={false} today={TODAY} />);
    expect(screen.getByTestId('goal-pace-panel')).toBeInTheDocument();
    expect(screen.getByText('Setoran Wajib')).toBeInTheDocument();
    expect(screen.getByText('Longgar')).toBeInTheDocument();
    expect(screen.getByTestId('pace-row-1')).toHaveTextContent('Emergency Fund');
    expect(screen.getByTestId('pace-row-2')).toHaveTextContent('Umroh');
    // Umroh tanpa auto-setoran mendapat label jelas
    expect(screen.getByTestId('pace-row-2')).toHaveTextContent('Tanpa auto-setoran');
  });

  it('badge status Terlambat muncul untuk goal yang tertinggal jadwal', () => {
    const goals: GoalInput[] = [goal({ id: 5, name: 'Slow Goal', current_amount: 4_200_000 })];
    const analysis = analyzeGoalsPortfolio(goals, new Map(), 5_000_000, TODAY);
    render(<GoalPacePanel analysis={analysis} capacityLoading={false} today={TODAY} />);
    expect(screen.getByText('Terlambat')).toBeInTheDocument();
  });

  it('simulator: preset +500rb memunculkan perubahan ETA per goal', () => {
    const analysis = buildAnalysis();
    const { container } = render(
      <GoalPacePanel analysis={analysis} capacityLoading={false} today={TODAY} />
    );
    expect(container.textContent).toContain('Ekstra: IDR 0/bln');
    fireEvent.click(screen.getByText('+IDR 500.000'));
    expect(container.textContent).toContain('Ekstra: IDR 500.000/bln');
    // baris hasil simulator tampil dengan ETA bulan
    expect(container.textContent).toMatch(/ETA \d+ bln/);
  });

  it('simulator: tombol Reset mengembalikan ekstra ke 0', () => {
    const analysis = buildAnalysis();
    const { container } = render(
      <GoalPacePanel analysis={analysis} capacityLoading={false} today={TODAY} />
    );
    fireEvent.click(screen.getByText('+IDR 500.000'));
    fireEvent.click(screen.getByText('Reset'));
    expect(container.textContent).toContain('Ekstra: IDR 0/bln');
  });

  it('insight portofolio tampil dan seluruh teks bebas em-dash', () => {
    const analysis = buildAnalysis();
    const { container } = render(
      <GoalPacePanel analysis={analysis} capacityLoading={false} today={TODAY} />
    );
    expect(screen.getByTestId('pace-insights')).toBeInTheDocument();
    expect(container.textContent).not.toContain('—');
  });
});

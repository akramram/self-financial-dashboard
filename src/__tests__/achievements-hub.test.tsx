/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Achievements, { type AchievementsResult } from '../components/Achievements';

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    formatIdr: (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`,
  };
});

const mockAchievementsData: AchievementsResult = {
  highlights: [
    { label: 'Net Worth Peak', value: 'Rp 45.000.000', icon: '💎', subtext: 'Reached in March 2026' },
    { label: 'Total Tracked Spend', value: 'Rp 85.000.000', icon: '💸', subtext: '120 transactions logged' },
    { label: 'Best Savings Rate', value: '42.5%', icon: '💰', subtext: '4 periods above 10%' },
    { label: 'Savings Streak', value: '3', icon: '🔥', subtext: 'consecutive saving periods' },
    { label: 'Tracking Span', value: '8 mo', icon: '📅', subtext: '240 days since first entry' },
    { label: 'Net Worth Growth', value: '+55%', icon: '📈', subtext: 'from Rp 29.000.000' },
  ],
  badges: [
    {
      id: 'nw-10000000',
      title: '10 Million Club',
      description: 'Reach IDR 10.000.000 net worth',
      icon: '🥉',
      category: 'networth',
      tier: 'bronze',
      unlocked: true,
      unlockedDate: '2025-09-21',
      value: 'First hit in October 2025',
    },
    {
      id: 'nw-25000000',
      title: '25 Million Club',
      description: 'Reach IDR 25.000.000 net worth',
      icon: '🥈',
      category: 'networth',
      tier: 'silver',
      unlocked: true,
      unlockedDate: '2026-01-21',
      value: 'First hit in February 2026',
    },
    {
      id: 'nw-50000000',
      title: '50 Million Club',
      description: 'Reach IDR 50.000.000 net worth',
      icon: '🥇',
      category: 'networth',
      tier: 'gold',
      unlocked: false,
      unlockedDate: null,
      progress: { current: 44498342, target: 50000000, unit: 'IDR' },
    },
    {
      id: 'saver-streak-3',
      title: 'Savings Machine',
      description: 'Save money 3 salary periods in a row',
      icon: '⚙️',
      category: 'savings',
      tier: 'silver',
      unlocked: true,
      unlockedDate: '2026-02-21',
      value: '3-period streak',
    },
    {
      id: 'saver-streak-6',
      title: 'Savings Virtuoso',
      description: 'Save money 6 salary periods in a row',
      icon: '🏆',
      category: 'savings',
      tier: 'gold',
      unlocked: false,
      unlockedDate: null,
      progress: { current: 3, target: 6, unit: 'periods' },
    },
  ],
  unlockedCount: 3,
  totalCount: 5,
  nextMilestone: {
    id: 'nw-50000000',
    title: '50 Million Club',
    description: 'Reach IDR 50.000.000 net worth',
    icon: '🥇',
    category: 'networth',
    tier: 'gold',
    unlocked: false,
    unlockedDate: null,
    progress: { current: 44498342, target: 50000000, unit: 'IDR' },
  },
  levelInfo: {
    level: 3,
    title: 'Penabung Disiplin',
    progressToNext: 60,
    pointsToNext: 2,
  },
};

describe('Achievements Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders master level header, highlights and next milestone card', () => {
    render(<Achievements initialData={mockAchievementsData} />);

    // Header rank info
    expect(screen.getByText('Tingkat Prestasi Finansial')).toBeInTheDocument();
    expect(screen.getAllByText('Penabung Disiplin').length).toBeGreaterThan(0);
    expect(screen.getByText(/lencana terbuka/i)).toBeInTheDocument();

    // Next milestone card
    expect(screen.getByText('Target Terdekat Berikutnya')).toBeInTheDocument();
    expect(screen.getAllByText('50 Million Club').length).toBeGreaterThan(0);

    // Highlights
    expect(screen.getByText('Net Worth Peak')).toBeInTheDocument();
    expect(screen.getByText('Rp 45.000.000')).toBeInTheDocument();
    expect(screen.getByText('Best Savings Rate')).toBeInTheDocument();
  });

  it('filters badges by search query', () => {
    render(<Achievements initialData={mockAchievementsData} />);

    const searchInput = screen.getByPlaceholderText('Cari lencana atau kriteria...');
    fireEvent.change(searchInput, { target: { value: 'Savings Machine' } });

    expect(screen.getByRole('heading', { name: 'Savings Machine' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '10 Million Club' })).not.toBeInTheDocument();
  });

  it('filters badges by status (Unlocked / Locked)', () => {
    render(<Achievements initialData={mockAchievementsData} />);

    // Click Locked filter
    const lockedFilterBtn = screen.getByRole('button', { name: /Terkunci/i });
    fireEvent.click(lockedFilterBtn);

    // Locked badge headings in the badge list
    const headings50M = screen.getAllByRole('heading', { name: '50 Million Club' });
    expect(headings50M.length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Savings Virtuoso' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '10 Million Club' })).not.toBeInTheDocument();
  });

  it('opens detail dialog when a badge is clicked and shows progress/details', async () => {
    render(<Achievements initialData={mockAchievementsData} />);

    // Click the locked 50 Million Club card from the badges list (h4)
    const headings50M = screen.getAllByRole('heading', { name: '50 Million Club' });
    const badgeCardHeading = headings50M[headings50M.length - 1];
    const targetCard = badgeCardHeading.closest('[role="button"]')!;
    fireEvent.click(targetCard);

    // Dialog should open and display shortfall info
    await waitFor(() => {
      expect(screen.getByText(/Kekurangan untuk membuka lencana:/i)).toBeInTheDocument();
    });

    // Close dialog
    const closeBtn = screen.getByRole('button', { name: 'Tutup' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Kekurangan untuk membuka lencana:/i)).not.toBeInTheDocument();
    });
  });

  it('switches between Trophy Case, Timeline, and Level Matrix tabs', () => {
    render(<Achievements initialData={mockAchievementsData} />);

    // Default is Trophy Case
    expect(screen.getByPlaceholderText('Cari lencana atau kriteria...')).toBeInTheDocument();

    // Switch to Timeline
    const timelineTabBtn = screen.getByRole('button', { name: /Linimasa Milestone/i });
    fireEvent.click(timelineTabBtn);

    expect(screen.getByText('Linimasa Kronologis Pencapaian')).toBeInTheDocument();
    expect(screen.getByText('Jejak rekam tonggak finansial yang telah Anda raih sejak awal pencatatan.')).toBeInTheDocument();

    // Switch to Level Matrix
    const journeyTabBtn = screen.getByRole('button', { name: /Peringkat & XP Matrix/i });
    fireEvent.click(journeyTabBtn);

    expect(screen.getByText('Tangga Peringkat Finansial & Matriks XP')).toBeInTheDocument();
    expect(screen.getByText('Tahapan 10 Peringkat Kebebasan Finansial')).toBeInTheDocument();
  });

  it('has zero em dashes in rendered content (R-02 Antislop)', () => {
    const { container } = render(<Achievements initialData={mockAchievementsData} />);
    expect(container.textContent).not.toContain('—');
  });
});

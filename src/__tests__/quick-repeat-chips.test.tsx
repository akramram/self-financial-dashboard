/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import QuickRepeatChips from '../components/QuickRepeatChips';
import QuickAddTransactionModal from '../components/QuickAddTransactionModal';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const TITLES = [
  { title: 'Kopi Kenangan', amount: 22000, type: 'cash', category: 'Food', count: 9 },
  { title: 'Gojek', amount: 17500, type: 'credit_expense', category: 'Transport', count: 7 },
  { title: '   ', amount: 1000, type: 'cash', category: 'Others', count: 5 },
  { title: 'Listrik', amount: 210000, type: 'weird_type', category: 'Tagihan', count: 4 },
];

describe('QuickRepeatChips', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders frequent titles, drops blanks, sanitizes type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ titles: TITLES }));
    render(<QuickRepeatChips onPick={() => {}} />);
    const chips = await screen.findAllByRole('button');
    expect(chips).toHaveLength(3);
    expect(chips[0]).toHaveAccessibleName(/Repeat Kopi Kenangan/);
  });

  it('calls onPick with the full preset on click', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ titles: TITLES }));
    const onPick = vi.fn();
    render(<QuickRepeatChips onPick={onPick} />);
    fireEvent.click(await screen.findByRole('button', { name: /Repeat Gojek/ }));
    expect(onPick).toHaveBeenCalledWith({
      title: 'Gojek',
      amount: 17500,
      type: 'credit_expense',
      category: 'Transport',
    });
  });

  it('renders nothing when the request fails or is empty', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const { container } = render(<QuickRepeatChips onPick={() => {}} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('QuickAddTransactionModal — repeat chips', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).includes('/api/title-presets') ? jsonResponse({ titles: TITLES }) : jsonResponse([])
      )
    );
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('prefills title, category and amount from a chip', async () => {
    render(<QuickAddTransactionModal open={true} onOpenChange={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /Repeat Kopi Kenangan/ }));
    const title = screen.getByLabelText(/Title/i) as HTMLInputElement;
    expect(title.value).toBe('Kopi Kenangan');
  });
});
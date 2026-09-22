/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock InView-dependent pieces are not needed — SectionNavRail queries the DOM
// for [data-section] elements, so we mount real ones.

import SectionNavRail from '../components/SectionNavRail';

const mountSections = () => {
  ['pulse', 'flow', 'act', 'insights', 'feed', 'charts'].forEach((id) => {
    const el = document.createElement('section');
    el.dataset.section = id;
    document.body.appendChild(el);
  });
};

describe('SectionNavRail', () => {
  beforeEach(() => {
    mountSections();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one chip per mounted section', () => {
    render(<SectionNavRail sections={[
      { id: 'pulse', label: 'Pulse' },
      { id: 'flow', label: 'Flow' },
      { id: 'act', label: 'Act' },
      { id: 'insights', label: 'Insights' },
      { id: 'feed', label: 'Feed' },
      { id: 'charts', label: 'Charts' },
    ]} />);
    expect(screen.getByRole('button', { name: 'Pulse' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insights' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Feed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Charts' })).toBeInTheDocument();
  });

  it('hides chips for sections missing from the DOM', async () => {
    // Two real sections mounted (from beforeEach's six), one ghost
    render(<SectionNavRail sections={[
      { id: 'pulse', label: 'Pulse' },
      { id: 'charts', label: 'Charts' },
      { id: 'nonexistent', label: 'Ghost' },
    ]} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pulse' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Charts' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ghost' })).not.toBeInTheDocument();
  });

  it('returns null when fewer than two sections are mounted', () => {
    document.body.innerHTML = '';
    const el = document.createElement('section');
    el.dataset.section = 'pulse';
    document.body.appendChild(el);
    const { container } = render(<SectionNavRail sections={[{ id: 'pulse', label: 'Pulse' }]} />);
    expect(container.firstChild).toBeNull();
  });

  it('smooth-scrolls to the section on chip click (offset for sticky chrome)', async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', { value: scrollTo, writable: true });
    // jsdom window.innerWidth = 1024 → not < 1024 → desktop offset 84
    const charts = document.querySelector('[data-section="charts"]') as HTMLElement;
    const spy = vi.spyOn(charts, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);

    render(<SectionNavRail sections={[
      { id: 'pulse', label: 'Pulse' },
      { id: 'charts', label: 'Charts' },
    ]} />);
    const chip = await screen.findByRole('button', { name: 'Charts' });
    fireEvent.click(chip);

    expect(scrollTo).toHaveBeenCalledTimes(1);
    const calledTop = scrollTo.mock.calls[0][0].top;
    // jsdom: innerWidth 1024 (desktop topbar 64) + rail offsetHeight 0 in jsdom → fallback 40 + 6
    expect(calledTop).toBe(500 - (64 + 40 + 6));
    expect(scrollTo.mock.calls[0][0].behavior).toBe('smooth');
    spy.mockRestore();
  });
});

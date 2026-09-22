import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SectionMeta {
  id: string;
  label: string;
}

/**
 * Sticky section rail for the Dashboard — horizontal chips that sit under the
 * mobile top bar (and float over content on desktop), with scroll-spy:
 * the active chip tracks the section currently in view, tap to smooth-scroll.
 *
 * Sections are looked up by their InView wrapper via a `data-section` attr;
 * missing sections are hidden instead of rendering dead chips.
 */
export default function SectionNavRail({ sections }: { sections: SectionMeta[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '');
  const [visible, setVisible] = useState<string[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Discover which sections actually rendered + scroll-spy via IntersectionObserver
  useEffect(() => {
    const els = sections
      .map((s) => document.querySelector<HTMLElement>(`[data-section="${s.id}"]`))
      .filter((el): el is HTMLElement => el !== null);
    setVisible(els.map((el) => el.dataset.section!));

    // ponytail: ratio-based pick — swap for scroll-position math if sections
    // ever become shorter than the -40% root margin band.
    if (typeof IntersectionObserver === 'undefined') return; // jsdom / ancient browsers
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive((entry.target as HTMLElement).dataset.section!);
          }
        }
      },
      // A band slightly above viewport center — feels natural for tall sections.
      { rootMargin: '-35% 0px -55% 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Keep the active chip in view inside the scrollable rail (mobile)
  useEffect(() => {
    const chip = chipRefs.current[active];
    chip?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  const jump = useCallback((id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (!el) return;
    // Sticky rail + top bar sit above content; measure the rail itself so the
    // section header lands just below it (mobile h-14 / desktop h-16 topbar).
    const topbarH = window.innerWidth < 1024 ? 56 : 64;
    const railH = railRef.current?.offsetHeight || 40;
    const offset = topbarH + railH + 6;
    // InView reveal runs a y-transform; un-revealed sections measure 24px low.
    // Subtract the live translate so the jump targets the final position.
    let ty = 0;
    try {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      ty = m.m42 || 0;
    } catch { /* 'none' or unsupported → 0 */ }
    const y = el.getBoundingClientRect().top - ty + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActive(id);
  }, []);

  if (visible.length < 2) {
    // Still waiting for section discovery — render nothing until we know
    // there are at least two navigable sections.
    return null;
  }

  const chips = sections.filter((s) => visible.includes(s.id));
  if (chips.length < 2) return null;

  return (
    <div
      ref={railRef}
      className="sticky top-14 lg:top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-6 px-4 sm:px-6 lg:px-6 py-2 bg-background/95 dark:bg-navy-950/90 backdrop-blur-xl border-b border-border/60 dark:border-white/[0.04]"
      role="navigation"
      aria-label="Dashboard sections"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {chips.map((s) => {
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                ref={(el) => { chipRefs.current[s.id] = el; }}
                onClick={() => jump(s.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`shrink-0 px-3 h-7 rounded-full text-xs font-medium transition-colors border ${
                  isActive
                    ? 'bg-mint-500/15 border-mint-500/40 text-mint-700 dark:text-mint-300'
                    : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/80'
                }`}
              >
                {s.label}
              </button>
            );
          })}
      </div>
    </div>
  );
}

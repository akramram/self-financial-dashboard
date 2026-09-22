import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, useInView } from 'motion/react';

interface InViewProps extends React.ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode;
  /** seconds before the reveal starts */
  delay?: number;
  /** distance in px the element rises as it fades in */
  y?: number;
  /** blur radius at start */
  blur?: number;
  duration?: number;
  once?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Blur-up reveal on scroll (pattern from motion-primitives InView).
 * Static until JS hydrates — SSR shows final state content un-animated.
 * Extra props (data-*, aria-*) spread onto the rendered element.
 */
export default function InView({
  children,
  delay = 0,
  y = 24,
  blur = 8,
  duration = 0.6,
  once = true,
  as = 'div',
  ...rest
}: InViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once, margin: '-10% 0px' });
  const MotionTag = (as === 'div' ? motion.div : (motion as any)[as]) as typeof motion.div;

  return (
    <MotionTag
      ref={ref}
      className={cn(rest.className)}
      // ponytail: cast — motion's prop types clash with a few DOM handler
      // signatures when spread wholesale; we never pass those.
      {...(rest as Record<string, unknown>)}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </MotionTag>
  );
}

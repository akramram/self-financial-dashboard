import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, useInView } from 'motion/react';

interface InViewProps {
  children: React.ReactNode;
  className?: string;
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
 */
export default function InView({
  children,
  className,
  delay = 0,
  y = 24,
  blur = 8,
  duration = 0.6,
  once = true,
  as = 'div',
}: InViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once, margin: '-10% 0px' });
  const MotionTag = (as === 'div' ? motion.div : (motion as any)[as]) as typeof motion.div;

  return (
    <MotionTag
      ref={ref}
      className={cn(className)}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </MotionTag>
  );
}

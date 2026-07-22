import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

interface AnimatedCounterProps {
  value: number;
  formatFn?: (value: number) => string;
  className?: string;
  duration?: number;
}

const defaultFormat = (v: number) => v.toLocaleString('id-ID');

export default function AnimatedCounter({
  value,
  formatFn = defaultFormat,
  className,
  duration = 0.6,
}: AnimatedCounterProps) {
  const spring = useSpring(0, {
    stiffness: 80,
    damping: 20,
    duration,
  });
  const rounded = useTransform(spring, (v: number) => Math.round(v));
  const display = useTransform(rounded, (v: number) => formatFn(v));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className={cn('tabular-nums', className)}>
      {display}
    </motion.span>
  );
}

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

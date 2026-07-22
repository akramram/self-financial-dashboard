import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'hero';
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  default: 'glass-card',
  elevated: 'glass-card-elevated',
  hero: 'rounded-2xl backdrop-blur-xl border border-mint-500/[0.12] shadow-glow-mint',
};

export default function GlassCard({ variant = 'default', className, children, style, ...props }: GlassCardProps) {
  if (variant === 'hero') {
    return (
      <div
        className={cn('relative overflow-hidden rounded-2xl', className)}
        style={{
          background: 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(14,165,233,0.1) 40%, rgba(52,211,153,0.05) 100%)',
          ...style,
        }}
        {...props}
      >
        {/* Background glow */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(52,211,153,0.3), transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />
        <div className="relative">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn(variantStyles[variant], 'p-5', className)} style={style} {...props}>
      {children}
    </div>
  );
}

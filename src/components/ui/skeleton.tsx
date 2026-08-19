import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Content-shaped skeleton block — replaces bare spinner loading states.
 * Usage: <Skeleton className="h-4 w-full" />
 */
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-white/10', className)}
    {...props}
  />
));
Skeleton.displayName = 'Skeleton';

export { Skeleton };

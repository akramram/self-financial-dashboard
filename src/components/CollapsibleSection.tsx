import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  icon?: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  /** Optional badge/count shown next to title */
  badge?: React.ReactNode;
}

export default function CollapsibleSection({
  id,
  title,
  icon,
  isCollapsed,
  onToggle,
  children,
  className = '',
  badge,
}: Props) {
  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-expanded={!isCollapsed}
            aria-controls={`widget-content-${id}`}
          >
            <span className="text-slate-400 dark:text-slate-500 transition-transform duration-200">
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {icon}
              {title}
              {badge && <span className="ml-1">{badge}</span>}
            </CardTitle>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-7 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            {isCollapsed ? 'Show' : 'Hide'}
          </Button>
        </div>
      </CardHeader>
      <div
        id={`widget-content-${id}`}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        <CardContent className={isCollapsed ? 'pt-0' : undefined}>
          {children}
        </CardContent>
      </div>
    </Card>
  );
}

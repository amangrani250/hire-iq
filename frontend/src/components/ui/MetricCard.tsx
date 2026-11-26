import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  className?: string;
}

export default function MetricCard({ label, value, hint, icon: Icon, className }: MetricCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-3.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        {Icon && <Icon size={12} className="text-muted-foreground/70" />}
      </div>
      <p className="mt-1 font-display text-[20px] font-semibold tracking-[-0.03em] text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

import { useRef, type ComponentType, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
  badge?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  variant?: 'contained' | 'muted';
}

/**
 * Accessible tab bar with arrow-key navigation.
 * Use for local UI state, not route navigation.
 */
export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  variant = 'contained',
}: TabsProps<T>) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    const current = items.findIndex((item) => item.value === value);
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    const target = items[next];
    if (!target) return;
    onChange(target.value);
    requestAnimationFrame(() => buttonsRef.current[next]?.focus());
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn('flex gap-1', className)}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors',
              selected
                ? variant === 'contained'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            {Icon && <Icon size={12} />}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

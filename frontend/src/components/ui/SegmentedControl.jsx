import { cn } from '../../lib/cn';

/**
 * SegmentedControl — compact single-select control for view/level switches.
 * options: [{ value, label, icon? }]
 */
export default function SegmentedControl({ options, value, onChange, label, className }) {
  return (
    <div className={cn('segmented', className)} role="group" aria-label={label}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn('segmented-item', active && 'segmented-item-active')}
          >
            {Icon && <Icon size={13} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

import { cn } from '../../lib/cn';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-subtle px-6 py-16 text-center',
        className
      )}
    >
      {Icon && (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
          <Icon size={19} />
        </span>
      )}
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

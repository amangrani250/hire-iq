import { cn } from '../../lib/cn';

export default function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

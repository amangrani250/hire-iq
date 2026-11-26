import { cn } from '../../lib/cn';

export default function CodeBlock({
  title,
  children,
  className,
  tone = 'default',
}: {
  title?: string;
  children: string;
  className?: string;
  tone?: 'default' | 'dark';
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {title && (
        <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      )}
      <pre
        className={cn(
          'mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border p-2.5 font-mono text-[11.5px] leading-relaxed',
          tone === 'dark'
            ? 'border-transparent bg-[#0a0f0d] text-[#d7e4de]'
            : 'bg-subtle text-foreground'
        )}
      >
        {children || '—'}
      </pre>
    </div>
  );
}

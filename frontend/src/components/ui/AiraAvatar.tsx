import { cn } from '../../lib/cn';

const SIZES = {
  sm: { wrapper: 'h-8 w-8', inner: 'h-6 w-6 text-[11px]' },
  md: { wrapper: 'h-10 w-10', inner: 'h-7 w-7 text-[13px]' },
  lg: { wrapper: 'h-12 w-12', inner: 'h-9 w-9 text-[15px]' },
} as const;

/**
 * Aira's avatar. Kept in one place so the interviewer reads the same across
 * the coding lab, transcript, and future interview surfaces.
 */
export default function AiraAvatar({
  size = 'md',
  className,
  online = false,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  online?: boolean;
}) {
  const sizes = SIZES[size];
  return (
    <span
      role="img"
      aria-label={online ? 'Aira, AI interviewer, online' : 'Aira, AI interviewer'}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10',
        sizes.wrapper,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded-full bg-primary font-display font-semibold text-primary-foreground',
          sizes.inner
        )}
      >
        A
      </span>
      {online && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success"
        />
      )}
    </span>
  );
}

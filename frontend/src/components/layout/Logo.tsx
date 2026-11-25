import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center gap-[2px] rounded-[8px] bg-primary text-primary-foreground',
        className
      )}
      aria-hidden="true"
    >
      <span className="block h-[7px] w-[2px] rounded-full bg-current opacity-70" />
      <span className="block h-[12px] w-[2px] rounded-full bg-current" />
      <span className="block h-[9px] w-[2px] rounded-full bg-current opacity-85" />
    </span>
  );
}

export default function Logo({
  to = '/',
  className,
  showWordmark = true,
}: {
  to?: string;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn('group inline-flex items-center gap-2.5 rounded-md', className)}
      aria-label="HireIQ home"
    >
      <LogoMark className="transition-transform duration-200 group-hover:scale-105" />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">
          Hire<span className="text-primary">IQ</span>
        </span>
      )}
    </Link>
  );
}

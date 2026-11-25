import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function Spinner({ size = 16, className, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center">
      <Loader2 size={size} className={cn('spin', className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

import { useEffect, useState } from 'react';
import { useInterval } from '../../hooks/useInterval';

function formatClock(totalSeconds: number): string {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Isolated running clock. Keeping the interval inside this component prevents
 * the editor/workspace tree from re-rendering every second.
 */
export default function ElapsedClock({
  startedAt,
  className,
}: {
  startedAt: number | null;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
  }, [startedAt]);

  useInterval(() => setNow(Date.now()), startedAt ? 1000 : null);

  const seconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  return <span className={className}>{formatClock(seconds)}</span>;
}

import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const TONES = {
  neutral: '',
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  solid: 'badge-solid',
} as const;

export type BadgeTone = keyof typeof TONES;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return <span className={cn('badge', TONES[tone], className)} {...props} />;
}

export default Badge;

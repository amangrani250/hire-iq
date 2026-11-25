import { cn } from '../../lib/cn';

const TONES = {
  neutral: '',
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  solid: 'badge-solid',
};

export function Badge({ className, tone = 'neutral', ...props }) {
  return <span className={cn('badge', TONES[tone], className)} {...props} />;
}

export default Badge;

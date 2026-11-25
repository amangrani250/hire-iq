import { forwardRef, type ButtonHTMLAttributes, type ElementType, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  icon: 'btn-icon',
} as const;

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
type ButtonSize = keyof typeof SIZES;

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  to?: string;
  as?: ElementType;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
}

/**
 * Button — the single action primitive.
 * variant: primary | secondary | outline | ghost | danger | link
 * size: sm | md | lg | icon
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', href, as, type, children, ...props },
  ref
) {
  const Component = (as || (href ? 'a' : 'button')) as ElementType;
  const isNativeButton = Component === 'button';

  return (
    <Component
      ref={ref}
      href={href}
      type={isNativeButton ? type || 'button' : undefined}
      className={cn('btn', `btn-${variant}`, SIZES[size], className)}
      {...props}
    >
      {children}
    </Component>
  );
});

export default Button;

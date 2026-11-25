import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  icon: 'btn-icon',
};

/**
 * Button — the single action primitive.
 * variant: primary | secondary | outline | ghost | danger | link
 * size: sm | md | lg | icon
 */
export const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', href, as, type, children, ...props },
  ref
) {
  const Component = as || (href ? 'a' : 'button');
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

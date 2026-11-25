import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type DivProps = HTMLAttributes<HTMLDivElement>;

export interface CardProps extends DivProps {
  interactive?: boolean;
  as?: ElementType;
}

export function Card({ className, interactive = false, as: Component = 'div', ...props }: CardProps) {
  return <Component className={cn('card', interactive && 'card-interactive', className)} {...props} />;
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, as: Component = 'h3', ...props }: DivProps & { as?: ElementType }) {
  return (
    <Component
      className={cn('text-[15px] font-semibold tracking-[-0.01em] text-foreground', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: DivProps) {
  return <p className={cn('text-[13px] leading-relaxed text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: DivProps) {
  return <div className={cn('flex items-center gap-2 border-t border-border px-5 py-3.5 sm:px-6', className)} {...props} />;
}

export default Card;

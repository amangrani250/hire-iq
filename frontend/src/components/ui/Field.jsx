import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export const Label = forwardRef(function Label({ className, ...props }, ref) {
  return <label ref={ref} className={cn('label', className)} {...props} />;
});

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid ? 'true' : undefined}
      className={cn('input-field', className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid ? 'true' : undefined}
      className={cn('input-field resize-y', className)}
      {...props}
    />
  );
});

/**
 * Field — label + control + hint/error with correct aria wiring.
 */
export function Field({ label, hint, error, htmlFor, id, children, className }) {
  const generatedId = useId();
  const fieldId = id || htmlFor || generatedId;
  const descriptionId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn('w-full', className)}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      {children({ id: fieldId, 'aria-describedby': errorId || descriptionId, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          <AlertCircle size={13} /> {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Field;

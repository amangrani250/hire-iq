export function required(message = 'Required') {
  return (value: string) => (!value?.trim() ? message : undefined);
}

export function minLength(min: number, message?: string) {
  return (value: string) =>
    value?.length < min ? (message || `Minimum ${min} characters`) : undefined;
}

export function maxLength(max: number, message?: string) {
  return (value: string) =>
    value?.length > max ? (message || `Maximum ${max} characters`) : undefined;
}

export function email(message = 'Invalid email') {
  return (value: string) =>
    value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? message : undefined;
}

export function url(message = 'Invalid URL') {
  return (value: string) =>
    value && !/^https?:\/\/.+\..+/.test(value) ? message : undefined;
}

export function phone(message = 'Invalid phone number') {
  return (value: string) =>
    value && !/^[\d\s\-+()]{7,}$/.test(value) ? message : undefined;
}

export function compose<T>(...validators: ((value: T) => string | undefined)[]) {
  return (value: T) => {
    for (const fn of validators) {
      const err = fn(value);
      if (err) return err;
    }
  };
}

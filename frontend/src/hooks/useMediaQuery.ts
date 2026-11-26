import { useCallback, useSyncExternalStore } from 'react';

function subscribeToQuery(query: string, onChange: () => void) {
  const mq = window.matchMedia(query);
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange);

  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', onChange);
    else mq.removeListener(onChange);
  };
}

/**
 * Subscribes to a media query through React's external store so the value is
 * always in sync with the current query (no stale state after prop changes,
 * no extra effect render pass).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => subscribeToQuery(query, onChange), [query]);
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDeviceDetect(): DeviceType {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function useTouchDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}

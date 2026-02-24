import { useState, useEffect } from 'react';

/**
 * Returnează true dacă dispozitivul e touch (mobil/tabletă).
 * Folosește media query `pointer: coarse` — mouse = fine, touch = coarse.
 * Returnează null înainte de montare (SSR-safe).
 */
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

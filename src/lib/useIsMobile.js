import { useState, useEffect } from 'react';

/* Detecta viewport mobile e atualiza em tempo real ao redimensionar. */
export function useIsMobile(query = '(max-width: 768px)') {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}

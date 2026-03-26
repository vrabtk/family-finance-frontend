import { useEffect, useState } from 'react';

export default function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;
  const getMatch = () => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  );

  const [isMobile, setIsMobile] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [query]);

  return isMobile;
}

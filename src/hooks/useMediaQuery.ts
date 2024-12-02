import { useState, useEffect } from 'react';

type MediaQueryCallback = (matches: boolean) => void;

/**
 * Hook to handle media queries with SSR support
 * @param {string} query The media query to match against
 * @param {boolean} defaultState The default state to use before media query is evaluated
 * @returns {boolean} Whether the media query matches
 */
export function useMediaQuery(query: string, defaultState: boolean = false): boolean {
  const [matches, setMatches] = useState<boolean>(defaultState);

  useEffect(() => {
    // Check if window is defined (for SSR)
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // Set initial state
    setMatches(media.matches);

    // Define listener
    const listener = (e: MediaQueryListEvent): void => setMatches(e.matches);

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } 
    // Legacy support
    else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]);

  return matches;
}

/**
 * Common media query breakpoints
 */
export const mediaQueries = {
  isMobile: '(max-width: 768px)',
  isTablet: '(min-width: 769px) and (max-width: 1024px)',
  isDesktop: '(min-width: 1025px)',
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
  prefersDarkMode: '(prefers-color-scheme: dark)',
  isRetina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)'
} as const;

/**
 * Type for media query keys
 */
export type MediaQueryKey = keyof typeof mediaQueries; 
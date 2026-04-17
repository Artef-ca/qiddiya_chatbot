'use client';

import { useState, useEffect } from 'react';


const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const DESKTOP_LARGE_BREAKPOINT = 1440;

interface Breakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isDesktopLarge: boolean;
  width: number;
}

/**
 * Hook to get responsive breakpoint information
 */
export function useResponsive(): Breakpoints {
  const [breakpoints, setBreakpoints] = useState<Breakpoints>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isDesktopLarge: true,
        width: 0,
      };
    }

    const width = window.innerWidth;
    return {
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT && width < DESKTOP_LARGE_BREAKPOINT,
      isDesktopLarge: width >= DESKTOP_LARGE_BREAKPOINT,
      width,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setBreakpoints({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT && width < DESKTOP_LARGE_BREAKPOINT,
        isDesktopLarge: width >= DESKTOP_LARGE_BREAKPOINT,
        width,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoints;
}

/**
 * Hook to check if screen is mobile
 */
export function useIsMobile(): boolean {
  return useResponsive().isMobile;
}


'use client';

import { useEffect, useState } from 'react';

/**
 * - Production: only dataset APIs are mocked; conversations / pinned / groups / chat / auth use real API only.
 * - Dev: dataset + welcome + alerts mock; conversations / pinned / groups mock only when NEXT_PUBLIC_USE_MOCK_API=true (if unset = real API).
 * - Chat and auth are never mocked.
 */
const useMSW = true; // Always enabled for conversations/datasets mocks

export default function MSWProvider({ children }: { children: React.ReactNode }) {
  // Deployed: mswReady starts true so we never block. Local: starts false until worker is ready.
  const [mswReady, setMswReady] = useState(!useMSW);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!useMSW) {
      setMswReady(true);
      return;
    }

    // Set a timeout to ensure we don't block the app forever
    const timeoutId = setTimeout(() => {
      console.warn('MSW initialization timeout - continuing without MSW');
      setMswReady(true);
    }, 5000); // 5 second timeout

    (async () => {
      try {
        const { worker } = await import('@/mocks/browser');
        await worker.start({
          onUnhandledRequest: (req, print) => {
            const url = req.url.toString();
            // Log unhandled requests for debugging
            if (process.env.NODE_ENV === 'development') {
              // Only log if it's a pinned/groups API that should be mocked
              if (url.includes('/api/pinned') || url.includes('/api/groups')) {
                console.warn('[MSW] ⚠️ Unhandled request (bypassing to real API):', req.method, url);
                console.warn('[MSW] Set NEXT_PUBLIC_USE_MOCK_API=true in .env to enable mocks for pinned/groups (conversation + dataset always mock)');
              }
            }
            // Bypass to real API for unhandled requests (auth, chat, etc.)
            // Dataset + conversation are always mocked, so they should be handled
            // Pinned/groups: real API in prod; set NEXT_PUBLIC_USE_MOCK_API=true in .env for mocks in dev
            // Don't print warnings for expected unhandled requests
            if (!url.includes('/api/auth') && 
                !url.includes('/api/chat') && 
                !url.includes('/api/user/profile')) {
              // Only print warning for unexpected unhandled requests
            }
          },
          serviceWorker: { url: '/mockServiceWorker.js' },
        });
        console.log('[MSW] Enabled - Mock APIs are active');
        console.log('[MSW] Dataset + Conversation: always mock. Pinned/Groups mock when NEXT_PUBLIC_USE_MOCK_API=true in dev.');
        clearTimeout(timeoutId);
        setMswReady(true);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('already been registered') || msg.includes('redirect')) {
          console.warn('MSW service worker issue (continuing anyway):', msg);
        } else {
          console.error('MSW initialization error:', error);
        }
        clearTimeout(timeoutId);
        // Always set ready even on error to prevent blocking the app
        setMswReady(true);
      }
    })();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Server: always render children (MSW runs only in the browser).
  if (typeof window === 'undefined') return <>{children}</>;
  // Always render children - MSW is optional and shouldn't block the app
  // Even if MSW isn't ready, render the app (MSW will work when ready)
  return <>{children}</>;
}


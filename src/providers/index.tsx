'use client';

import StoreProvider from './StoreProvider';
import QueryProvider from './QueryProvider';
import MSWProvider from './MSWProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MSWProvider>
      <StoreProvider>
        <QueryProvider>{children}</QueryProvider>
      </StoreProvider>
    </MSWProvider>
  );
}


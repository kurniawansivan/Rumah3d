"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Next.js Server Components can't hold a `QueryClient` instance (it carries
 * client-only cache/subscription state), so this thin client-component
 * wrapper creates one per browser session and provides it to the tree.
 * `useState(() => ...)` (not a bare `new QueryClient()`) so the client is
 * created exactly once per component instance, not on every render.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

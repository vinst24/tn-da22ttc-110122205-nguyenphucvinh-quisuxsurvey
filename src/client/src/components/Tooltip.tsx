import type { ReactNode } from 'react';


// Simple tooltip wrapper (fallback) to avoid adding new dependencies.
// Current usage is optional via `title`, so this is mostly a placeholder.
export function Tooltip({ children }: { children: ReactNode }) {
  return <>{children}</>;
}


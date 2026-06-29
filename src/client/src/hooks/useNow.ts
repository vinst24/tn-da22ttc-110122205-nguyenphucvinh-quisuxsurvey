import { useEffect, useState } from 'react';

/**
 * Returns the current timestamp (Date.now()) updated every `intervalMs` milliseconds.
 * Default interval: 1000ms (1 second).
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
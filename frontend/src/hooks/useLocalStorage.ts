import { useCallback, useEffect, useState } from 'react';

/**
 * Persist state in localStorage with SSR-safe hydration.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [initialValue, key]);

  const [stored, setStored] = useState<T>(readValue);

  useEffect(() => {
    setStored(readValue());
  }, [readValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(next));
        }
        return next;
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    setStored(initialValue);
  }, [initialValue, key]);

  return [stored, setValue, remove];
}

import { useEffect, useRef } from "react";

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void | Promise<void>,
  delay: number
): (...args: A) => void {
  const ref = useRef(fn);
  ref.current = fn;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  return (...args: A) => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      void ref.current(...args);
    }, delay);
  };
}

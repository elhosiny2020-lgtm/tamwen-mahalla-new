import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * خطاف آمن لمنع أخطاء Hydration Mismatch (React #418) عند قراءة localStorage في Next.js
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

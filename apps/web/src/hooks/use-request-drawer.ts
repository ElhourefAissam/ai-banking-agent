'use client';

import { useQueryState, parseAsString } from 'nuqs';
import { useCallback } from 'react';

/**
 * Enterprise URL-synchronized drawer state hook powered by nuqs.
 * Synchronizes the active banking request reference (?ref=REQ-YYYY-XXXX)
 * with the browser history shallowly without causing full page hydration,
 * flashing, or unmounting background components.
 */
export function useRequestDrawer() {
  const [requestRef, setRequestRef] = useQueryState(
    'ref',
    parseAsString.withOptions({
      shallow: true,
      history: 'push',
    })
  );

  const openRequest = useCallback(
    (reference: string) => {
      setRequestRef(reference);
    },
    [setRequestRef]
  );

  const closeRequest = useCallback(() => {
    setRequestRef(null);
  }, [setRequestRef]);

  return {
    requestRef,
    openRequest,
    closeRequest,
    isOpen: Boolean(requestRef),
  };
}

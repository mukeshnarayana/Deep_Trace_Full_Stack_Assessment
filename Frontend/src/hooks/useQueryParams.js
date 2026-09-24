import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Hook to synchronize state with URL search parameters
 * Stabilized against object reference churn.
 */
export const useQueryParams = (defaultParams = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Only update ref if keys actually change
  const serializedDefaults = JSON.stringify(defaultParams);
  const memoizedDefaults = useMemo(() => {
    return JSON.parse(serializedDefaults);
  }, [serializedDefaults]);

  // Parse current params
  const params = useMemo(() => {
    const current = { ...memoizedDefaults };
    for (const [key, value] of searchParams.entries()) {
      if (value !== undefined && value !== '') {
        current[key] = value;
      }
    }
    return current;
  }, [searchParams, memoizedDefaults]);

  // Update query params in the URL (merges and deletes empty keys)
  const setParams = useCallback(
    (newParams) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        let hasChanges = false;

        Object.entries(newParams).forEach(([key, val]) => {
          const currentVal = next.get(key);
          if (val === undefined || val === null || val === '') {
            if (next.has(key)) {
              next.delete(key);
              hasChanges = true;
            }
          } else if (String(val) !== currentVal) {
            next.set(key, String(val));
            hasChanges = true;
          }
        });

        return hasChanges ? next : prev;
      }, { replace: true });
    },
    [setSearchParams]
  );

  // Reset to default params
  const resetParams = useCallback(() => {
    setSearchParams(new URLSearchParams(memoizedDefaults), { replace: true });
  }, [setSearchParams, memoizedDefaults]);

  return { params, setParams, resetParams };
};

export default useQueryParams;

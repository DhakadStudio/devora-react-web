import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { listPathsTree, type PathTree } from '../engines/curriculum';

interface CurriculumContextType {
  data: PathTree[] | null;
  status: 'loading' | 'ready' | 'error';
  error: Error | null;
  refetch: () => Promise<void>;
}

const CurriculumContext = createContext<CurriculumContextType>({
  data: null,
  status: 'loading',
  error: null,
  refetch: async () => {
    // No-op
  },
});

export { CurriculumContext };

export function useCurriculum() {
  return useContext(CurriculumContext);
}

interface CurriculumProviderProps {
  children: ReactNode;
}

export function CurriculumProvider({ children }: CurriculumProviderProps) {
  const [data, setData] = useState<PathTree[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<Error | null>(null);
  const fetchPromiseRef = useRef<Promise<PathTree[] | void> | null>(null);

  useEffect(() => {
    // Check if we have a cached version in sessionStorage
    const cached = sessionStorage.getItem('devora-curriculum-cache');
    if (cached) {
      try {
        const payload = JSON.parse(cached);
        const { savedAt, tree } = payload;
        const TREE_REVALIDATE_MS = 30 * 1000; // 30 seconds
        if (Date.now() - savedAt <= TREE_REVALIDATE_MS) {
          // Cache is fresh, use it
          setData(tree);
          setStatus('ready');
          return;
        }
        // Cache is stale, we will fetch below (but we can set data to cached and status to loading?)
        // For simplicity, we will fetch and update the cache in the background.
        // We'll set the data to the cached tree and status to loading to indicate we are refreshing.
        setData(tree);
        setStatus('loading');
      } catch {
        // If parsing fails, we will fetch
      }
    }

    // If we already have a fetch promise, we don't need to start another one
    if (fetchPromiseRef.current) {
      return;
    }

    // Start a new fetch
    const fetchPromise: Promise<PathTree[] | void> = listPathsTree()
      .then((tree) => {
        // Update sessionStorage cache
        try {
          const payload = { savedAt: Date.now(), tree };
          sessionStorage.setItem('devora-curriculum-cache', JSON.stringify(payload));
        } catch {
          // Ignore errors in writing to sessionStorage
        }
        setData(tree);
        setStatus('ready');
        setError(null);
         return tree;
      })
      .catch((err) => {
        setData(null);
        setStatus('error');
        setError(err instanceof Error ? err : new Error('Unknown error'));
      });

    fetchPromiseRef.current = fetchPromise;

    // Clean up the ref when the promise settles
    fetchPromise.finally(() => {
      fetchPromiseRef.current = null;
    });
  }, []); // Empty deps means this runs once on mount

  const refetch = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const tree = await listPathsTree();
      // Update sessionStorage cache
      try {
        const payload = { savedAt: Date.now(), tree };
        sessionStorage.setItem('devora-curriculum-cache', JSON.stringify(payload));
      } catch {
        // Ignore errors in writing to sessionStorage
      }
      setData(tree);
      setStatus('ready');
    } catch (err) {
      setData(null);
      setStatus('error');
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, []);

  if (status === 'loading' && data === null) {
    return (
      <CurriculumContext.Provider value={{ data, status, error, refetch }}>
        {children}
      </CurriculumContext.Provider>
    );
  }

  return (
    <CurriculumContext.Provider value={{ data, status, error, refetch }}>
      {children}
    </CurriculumContext.Provider>
  );
}
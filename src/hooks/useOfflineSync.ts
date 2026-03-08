import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingAction {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const STORAGE_KEY = 'aquasmart_offline_queue';
const CONNECTION_KEY = 'aquasmart_last_online';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Get pending actions from localStorage
  const getPendingActions = useCallback((): PendingAction[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: PendingAction[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    setPendingCount(actions.length);
  }, []);

  // Add action to offline queue
  const queueAction = useCallback((action: Omit<PendingAction, 'id' | 'timestamp'>) => {
    const pending = getPendingActions();
    const newAction: PendingAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    pending.push(newAction);
    savePendingActions(pending);
    toast.info('Action queued for sync when online');
  }, [getPendingActions, savePendingActions]);

  // Sync pending actions
  const syncPendingActions = useCallback(async () => {
    const pending = getPendingActions();
    if (pending.length === 0) return;

    setIsSyncing(true);
    const failed: PendingAction[] = [];
    let successCount = 0;

    for (const action of pending) {
      try {
        const tableName = action.table as 'ponds' | 'alerts' | 'devices' | 'sensor_readings';
        
        if (action.type === 'insert') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase
            .from(tableName)
            .insert(action.data as any);
          if (error) throw error;
        } else if (action.type === 'update') {
          const { id, ...updateData } = action.data;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase
            .from(tableName)
            .update(updateData as any)
            .eq('id', id as string);
          if (error) throw error;
        } else if (action.type === 'delete') {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', action.data.id as string);
          if (error) throw error;
        }
        successCount++;
      } catch (error) {
        console.error('Failed to sync action:', error);
        failed.push(action);
      }
    }

    savePendingActions(failed);
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`Synced ${successCount} offline action${successCount > 1 ? 's' : ''}`);
    }
    if (failed.length > 0) {
      toast.error(`${failed.length} action${failed.length > 1 ? 's' : ''} failed to sync`);
    }
  }, [getPendingActions, savePendingActions]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      localStorage.setItem(CONNECTION_KEY, Date.now().toString());
      toast.success('Back online! Syncing data...');
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will be synced when connection is restored.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync if we're online and have pending actions
    if (navigator.onLine) {
      syncPendingActions();
    }

    // Update pending count
    setPendingCount(getPendingActions().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingActions, getPendingActions]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    queueAction,
    syncPendingActions,
  };
}

// Cached data hook for offline support
export function useOfflineData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useOfflineSync();

  const cacheKey = `aquasmart_cache_${key}`;

  const loadCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed.data);
        return true;
      }
    } catch {
      console.error('Failed to load cached data');
    }
    return false;
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!navigator.onLine) {
        const hasCached = loadCachedData();
        if (!hasCached) {
          setError('No internet connection and no cached data available');
        }
        setIsLoading(false);
        return;
      }

      const result = await fetchFn();
      setData(result);

      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify({
        data: result,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Fetch error:', err);
      
      // Try to load cached data on error
      const hasCached = loadCachedData();
      if (!hasCached) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, cacheKey, loadCachedData]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, isLoading, error, refetch: fetchData, isOnline };
}

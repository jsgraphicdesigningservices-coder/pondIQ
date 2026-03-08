import { useState, useEffect, useCallback } from 'react';
import { ref, query, orderByChild, limitToLast, get } from 'firebase/database';
import { database } from '@/lib/firebase';

export interface SensorHistoryPoint {
  timestamp: number;
  date: string;
  temperature: number;
  ph: number;
  dissolvedOxygen: number;
  turbidity?: number;
}

export type TimeRange = '1h' | '24h' | '7d';

interface UseSensorHistoryReturn {
  history: SensorHistoryPoint[];
  isLoading: boolean;
  error: string | null;
  hasData: boolean;
  refetch: () => Promise<void>;
  // Legacy compatibility
  phHistory: number[];
  doHistory: number[];
  tempHistory: number[];
  addReading: (reading: { ph: number; dissolvedOxygen: number; temperature: number }) => void;
}

// Filter invalid sensor readings
function isValidReading(reading: any): boolean {
  if (!reading) return false;
  if (reading.temperature <= -100 || reading.temperature > 50) return false;
  if (reading.ph < 0 || reading.ph > 14) return false;
  if (reading.dissolvedOxygen < 0 || reading.dissolvedOxygen > 20) return false;
  return true;
}

export function useSensorHistory(pondId: string, timeRange: TimeRange = '24h'): UseSensorHistoryReturn {
  const [history, setHistory] = useState<SensorHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTimeRangeMs = (range: TimeRange): number => {
    switch (range) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!database) {
      setError('Firebase not initialized');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const now = Date.now();
      const cutoff = now - getTimeRangeMs(timeRange);

      // Try to fetch from history path
      const historyRef = ref(database, `ponds/${pondId}/history`);
      const historyQuery = query(historyRef, orderByChild('timestamp'), limitToLast(500));
      
      const snapshot = await get(historyQuery);
      const data = snapshot.val();

      if (data && typeof data === 'object') {
        const points: SensorHistoryPoint[] = Object.entries(data)
          .map(([key, value]: [string, any]) => ({
            timestamp: value.timestamp || parseInt(key),
            date: new Date(value.timestamp || parseInt(key)).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            temperature: value.temperature ?? 0,
            ph: value.ph ?? 0,
            dissolvedOxygen: value.dissolvedOxygen ?? value.do ?? 0,
            turbidity: value.turbidity ?? 0,
          }))
          .filter(point => point.timestamp >= cutoff && isValidReading(point))
          .sort((a, b) => a.timestamp - b.timestamp);

        setHistory(points);
      } else {
        // No history data available
        setHistory([]);
      }
    } catch (err) {
      console.error('Error fetching sensor history:', err);
      setError('Failed to load sensor history');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [pondId, timeRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Legacy compatibility - add reading function (now a no-op since Firebase is source)
  const addReading = useCallback((reading: { ph: number; dissolvedOxygen: number; temperature: number }) => {
    // No-op - data comes from Firebase now
    console.log('addReading called but data comes from Firebase:', reading);
  }, []);

  return {
    history,
    isLoading,
    error,
    hasData: history.length > 0,
    refetch: fetchHistory,
    // Legacy compatibility
    phHistory: history.map(h => h.ph),
    doHistory: history.map(h => h.dissolvedOxygen),
    tempHistory: history.map(h => h.temperature),
    addReading,
  };
}

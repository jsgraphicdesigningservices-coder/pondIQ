import { useState, useEffect } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Alert } from '@/types/aquaculture';


export interface UseFirebaseAlertsResult {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  firebaseConnected: boolean;
  acknowledgeAlert: (alertId: string) => Promise<void>;
}

export function useFirebaseAlerts(pondId: string = 'pond1'): UseFirebaseAlertsResult {
  const cacheKey = `aqua_alerts_cache_${pondId}`;

  const getCachedAlerts = (): Alert[] => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) }));
      }
      return [];
    } catch {
      return [];
    }
  };

  const setCachedAlerts = (alerts: Alert[]): void => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(alerts));
    } catch {
      // localStorage might be full
    }
  };

  const [alerts, setAlerts] = useState<Alert[]>(() => getCachedAlerts());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  useEffect(() => {
    if (!database) {
      setError('Firebase database not initialized');
      setFirebaseConnected(false);
      setIsLoading(false);
      return;
    }

    const alertsRef = ref(database, `ponds/${pondId}/alerts`);

    const handleValue = (snapshot: any) => {
      try {
        const data = snapshot.val();
        if (data) {
          const alertsList: Alert[] = Object.entries(data).map(([key, value]: [string, any]) => ({
            id: key,
            pondId: 'aquaculture',
            pondName: 'Aquaculture System',
            type: (value.type || 'sensor') as Alert['type'],
            message: value.message || 'Alert triggered',
            severity: (value.severity || 'warning') as Alert['severity'],
            timestamp: new Date(value.timestamp || Date.now()),
            acknowledged: value.acknowledged || false,
          }));
          
          alertsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setAlerts(alertsList);
          setCachedAlerts(alertsList);
          setFirebaseConnected(true);
          setError(null);
        } else {
          setAlerts([]);
          setFirebaseConnected(true);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error parsing alerts data:', err);
        setError('Failed to parse alerts');
        setFirebaseConnected(false);
        setIsLoading(false);
      }
    };

    const handleError = (err: Error) => {
      console.error('Firebase alerts read error:', err);
      setError('Failed to connect to alerts');
      setFirebaseConnected(false);
      setIsLoading(false);
    };

    onValue(alertsRef, handleValue, handleError);

    return () => {
      off(alertsRef);
    };
  }, [pondId, cacheKey]);

  const acknowledgeAlert = async (alertId: string) => {
    if (!database) {
      throw new Error('Firebase database not initialized');
    }

    try {
      const alertRef = ref(database, `ponds/${pondId}/alerts/${alertId}`);
      await update(alertRef, { acknowledged: true });
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  };

  return { alerts, isLoading, error, firebaseConnected, acknowledgeAlert };
}

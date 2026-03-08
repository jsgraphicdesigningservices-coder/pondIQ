import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Device } from '@/types/aquaculture';

interface UseFirebaseDevicesReturn {
  devices: Device[];
  isLoading: boolean;
  error: string | null;
  firebaseConnected: boolean;
  pendingActionsCount: number;
  toggleDevice: (deviceId: string) => Promise<void>;
  setDeviceAuto: (deviceId: string, isAuto: boolean) => Promise<void>;
}

interface PendingAction {
  id: string;
  pondId: string;
  deviceId: string;
  value: 0 | 1;
  timestamp: number;
}

const PENDING_ACTIONS_KEY = 'aqua_pending_device_actions';

function getPendingActions(): PendingAction[] {
  try {
    const pending = localStorage.getItem(PENDING_ACTIONS_KEY);
    return pending ? JSON.parse(pending) : [];
  } catch {
    return [];
  }
}

function addPendingAction(action: PendingAction): void {
  try {
    const pending = getPendingActions();
    const filtered = pending.filter(a => !(a.deviceId === action.deviceId && a.pondId === action.pondId));
    filtered.push(action);
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(filtered));
  } catch {
    // localStorage might be full
  }
}

function removePendingAction(actionId: string): void {
  try {
    const pending = getPendingActions().filter(a => a.id !== actionId);
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pending));
  } catch {
    // Ignore errors
  }
}

const deviceConfig: Record<string, { name: string; icon: string; autoCondition?: string }> = {
  motor: { name: 'Water Pump', icon: 'Droplets', autoCondition: 'When water level is low' },
  aerator: { name: 'Power', icon: 'Zap', autoCondition: 'When DO < 5.0 mg/L' },
  light: { name: 'Lights', icon: 'Lightbulb', autoCondition: 'Scheduled lighting' },
};

export function useFirebaseDevices(pondId: string = 'pond1', readOnly: boolean = false): UseFirebaseDevicesReturn {
  // Use ref for pondId to avoid recreating callbacks
  const pondIdRef = useRef(pondId);
  pondIdRef.current = pondId;

  const getCachedDevices = useCallback((): Device[] => {
    try {
      const cached = localStorage.getItem(`aqua_devices_cache_${pondId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, [pondId]);

  const [devices, setDevices] = useState<Device[]>(() => {
    try {
      const cached = localStorage.getItem(`aqua_devices_cache_${pondId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [pendingActionsCount, setPendingActionsCount] = useState(() => getPendingActions().filter(a => a.pondId === pondId).length);
  const isOnlineRef = useRef(navigator.onLine);
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  // Sync pending actions when coming online
  useEffect(() => {
    const syncPendingActions = async () => {
      if (!database || !navigator.onLine) return;

      const pending = getPendingActions().filter(a => a.pondId === pondId);
      for (const action of pending) {
        try {
          const deviceRef = ref(database, `ponds/${action.pondId}/devices/${action.deviceId}/state`);
          await set(deviceRef, action.value);
          removePendingAction(action.id);
          setPendingActionsCount(getPendingActions().filter(a => a.pondId === pondId).length);
          console.log(`Synced pending action for device ${action.deviceId} on pond ${action.pondId}`);
        } catch (err) {
          console.error('Failed to sync pending action:', err);
        }
      }
    };

    const handleOnline = () => {
      isOnlineRef.current = true;
      syncPendingActions();
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      syncPendingActions();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pondId]);

  useEffect(() => {
    if (!database) {
      setError('Firebase database not initialized');
      setFirebaseConnected(false);
      setIsLoading(false);
      return;
    }

    const devicesRef = ref(database, `ponds/${pondId}/devices`);

    const unsubscribe = onValue(
      devicesRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            const deviceList: Device[] = Object.entries(data).map(([key, value]: [string, any]) => {
              const config = deviceConfig[key] || { name: key, icon: 'Wind' };
              // Value can be just 0|1 or an object with state/mode
              const state = typeof value === 'object' ? value.state : value;
              const mode = typeof value === 'object' ? value.mode : 'manual';
              
              return {
                id: key,
                name: config.name,
                type: key,
                isOn: state === 1,
                isAuto: mode === 'auto',
                icon: config.icon,
                autoCondition: config.autoCondition,
              };
            });
            
            setDevices(deviceList);
            // Cache using pondId directly
            try {
              localStorage.setItem(`aqua_devices_cache_${pondId}`, JSON.stringify(deviceList));
            } catch {}
            setFirebaseConnected(true);
            setError(null);
          } else {
            // Initialize with default devices if no data
            const defaultDevices: Device[] = [
              { id: 'motor', name: 'Water Pump', type: 'motor', isOn: false, isAuto: false, icon: 'Droplets', autoCondition: 'When water level is low' },
              { id: 'aerator', name: 'Power', type: 'aerator', isOn: false, isAuto: false, icon: 'Zap', autoCondition: 'When DO < 5.0 mg/L' },
              { id: 'light', name: 'Lights', type: 'light', isOn: false, isAuto: false, icon: 'Lightbulb', autoCondition: 'Scheduled lighting' },
            ];
            setDevices(defaultDevices);
            setFirebaseConnected(true);
          }
          setIsLoading(false);
        } catch (err) {
          console.error('Error parsing device data:', err);
          setError('Failed to parse device data');
          setFirebaseConnected(false);
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Firebase device read error:', err);
        setError('Failed to connect to device data');
        setFirebaseConnected(false);
        setIsLoading(false);
        // Load from cache on error
        try {
          const cached = localStorage.getItem(`aqua_devices_cache_${pondId}`);
          if (cached) {
            setDevices(JSON.parse(cached));
          }
        } catch {}
      }
    );

    return () => {
      unsubscribe();
    };
  }, [pondId]);

  const toggleDevice = useCallback(async (deviceId: string) => {
    if (readOnlyRef.current || !database) {
      console.log('Device control is read-only or Firebase not connected');
      return;
    }

    // Get current device state from the current devices state
    setDevices(prev => {
      const device = prev.find(d => d.id === deviceId);
      if (!device) return prev;

      // Only allow toggle if mode is manual
      if (device.isAuto) {
        console.log('Device is in auto mode, cannot toggle manually');
        return prev;
      }

      const newState: 0 | 1 = device.isOn ? 0 : 1;
      const currentPondId = pondIdRef.current;
      
      // Optimistic update
      const updated = prev.map(d => 
        d.id === deviceId ? { ...d, isOn: newState === 1 } : d
      );
      
      // Cache update
      try {
        localStorage.setItem(`aqua_devices_cache_${currentPondId}`, JSON.stringify(updated));
      } catch {}

      // Firebase update (async, but we don't wait for it)
      if (!navigator.onLine) {
        addPendingAction({
          id: `${Date.now()}_${currentPondId}_${deviceId}`,
          pondId: currentPondId,
          deviceId,
          value: newState,
          timestamp: Date.now(),
        });
        setPendingActionsCount(getPendingActions().filter(a => a.pondId === currentPondId).length);
        console.log(`Queued offline action for device ${deviceId} on pond ${currentPondId}`);
      } else {
        const deviceStateRef = ref(database, `ponds/${currentPondId}/devices/${deviceId}/state`);
        set(deviceStateRef, newState).catch(err => {
          console.error('Error toggling device:', err);
          setError('Failed to toggle device');
        });
      }

      return updated;
    });
  }, []);

  const setDeviceAuto = useCallback(async (deviceId: string, isAuto: boolean) => {
    if (readOnlyRef.current || !database) {
      console.log('Device control is read-only or Firebase not connected');
      return;
    }

    const currentPondId = pondIdRef.current;

    // Optimistic update first
    setDevices(prev => {
      const updated = prev.map(d => 
        d.id === deviceId ? { ...d, isAuto } : d
      );
      try {
        localStorage.setItem(`aqua_devices_cache_${currentPondId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      // Update mode in Firebase
      const deviceModeRef = ref(database, `ponds/${currentPondId}/devices/${deviceId}/mode`);
      await set(deviceModeRef, isAuto ? 'auto' : 'manual');
    } catch (err) {
      console.error('Error setting device mode:', err);
      setError('Failed to set device mode');
    }
  }, []);

  return { devices, isLoading, error, firebaseConnected, pendingActionsCount, toggleDevice, setDeviceAuto };
}

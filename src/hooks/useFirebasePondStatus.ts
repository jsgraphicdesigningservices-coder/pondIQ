import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';

export interface PondStatus {
  isOnline: boolean;
  lastSeen: Date | null;
  connectionError: string | null;
}

// Consider device offline if no heartbeat in last 15 seconds (reduced from 30)
const HEARTBEAT_TIMEOUT_MS = 15000;
// Device is definitely online if seen within 10 seconds
const ONLINE_THRESHOLD_MS = 10000;

function parseTimestamp(value: any): Date | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    const millis = value < 100000000000 ? value * 1000 : value;
    return new Date(millis);
  }

  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      const millis = asNumber < 100000000000 ? asNumber * 1000 : asNumber;
      return new Date(millis);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object') {
    if (typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000);
    }
    if (typeof value.timestamp === 'number') {
      const millis = value.timestamp < 100000000000 ? value.timestamp * 1000 : value.timestamp;
      return new Date(millis);
    }
  }

  return null;
}

function parseOnline(value: any): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'online', 'connected'].includes(normalized)) return true;
    if (['false', '0', 'offline', 'disconnected'].includes(normalized)) return false;
  }
  return null;
}

export function useFirebasePondStatus(pondId: string = 'pond1'): PondStatus {
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setConnectionError('Firebase database not initialized');
      return;
    }

    // Listen to status object and legacy lastSeen path
    const statusRef = ref(database, `ponds/${pondId}/status`);
    const legacyLastSeenRef = ref(database, `ponds/${pondId}/lastSeen`);

    let deviceReportedOnline = false;
    let lastSeenTime: Date | null = null;

    const checkOnlineStatus = () => {
      if (deviceReportedOnline) {
        // Device explicitly reported online
        setIsOnline(true);
        return;
      }

      if (lastSeenTime) {
        const now = Date.now();
        const timeSinceLastSeen = now - lastSeenTime.getTime();
        
        // Online if seen within threshold
        if (timeSinceLastSeen < ONLINE_THRESHOLD_MS) {
          setIsOnline(true);
        } else if (timeSinceLastSeen >= HEARTBEAT_TIMEOUT_MS) {
          // Offline only if heartbeat missing > 15 seconds
          setIsOnline(false);
        }
      }
    };

    const handleStatus = (snapshot: any) => {
      try {
        const status = snapshot.val() || {};

        const onlineValue =
          parseOnline(status.online) ??
          parseOnline(status.isOnline) ??
          parseOnline(status.connected);

        if (onlineValue !== null) {
          deviceReportedOnline = onlineValue;
        }

        const parsedTime =
          parseTimestamp(status.lastSeen) ??
          parseTimestamp(status.last_seen) ??
          parseTimestamp(status.heartbeat) ??
          parseTimestamp(status.lastHeartbeat) ??
          parseTimestamp(status.timestamp) ??
          parseTimestamp(status.updatedAt);

        if (parsedTime) {
          lastSeenTime = parsedTime;
          setLastSeen(lastSeenTime);
          setConnectionError(null);
          checkOnlineStatus();
          return;
        }

        // If status exists but heartbeat field is missing, treat explicit online as source of truth
        if (onlineValue !== null) {
          setConnectionError(null);
          checkOnlineStatus();
          return;
        }

        setLastSeen(null);
        setIsOnline(false);
      } catch (err) {
        console.error('Error parsing status:', err);
        setConnectionError('Failed to parse device status');
      }
    };

    const handleLegacyLastSeen = (snapshot: any) => {
      const parsedTime = parseTimestamp(snapshot.val());
      if (parsedTime) {
        lastSeenTime = parsedTime;
        setLastSeen(parsedTime);
        setConnectionError(null);
        checkOnlineStatus();
      }
    };

    const handleError = (err: Error) => {
      console.error('Firebase status error:', err);
      setConnectionError('Failed to connect to device status');
      setIsOnline(false);
    };

    onValue(statusRef, handleStatus, handleError);
    onValue(legacyLastSeenRef, handleLegacyLastSeen, () => {});

    // Set up interval to check if device went offline
    const intervalId = setInterval(() => {
      checkOnlineStatus();
    }, 3000); // Check every 3 seconds

    return () => {
      off(statusRef);
      off(legacyLastSeenRef);
      clearInterval(intervalId);
    };
  }, [pondId]);

  return { isOnline, lastSeen, connectionError };
}

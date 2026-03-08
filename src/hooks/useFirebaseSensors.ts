import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';

// Firebase sensor keys - MUST match exactly what ESP32 sends
// STRICT: Only pH and dissolvedOxygen from ESP32
// Temperature comes from Weather API, NOT Firebase
export interface FirebaseSensorData {
  ph: number | null;
  dissolvedOxygen: number | null;
}

// Check if at least one sensor has valid data
export function hasAnySensorData(data: FirebaseSensorData | null): boolean {
  if (!data) return false;
  return (
    typeof data.ph === 'number' ||
    typeof data.dissolvedOxygen === 'number'
  );
}

export interface SensorDebugInfo {
  firebasePath: string;
  listenerStatus: 'connecting' | 'active' | 'error' | 'disconnected';
  lastDataReceived: Date | null;
  rawData: any;
  errors: string[];
}

export interface UseFirebaseSensorsResult {
  sensorData: FirebaseSensorData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  firebaseConnected: boolean;
  isStale: boolean;
  debugInfo: SensorDebugInfo;
}

// Sensor data is stale if older than 60 seconds
const STALE_THRESHOLD_MS = 60000;

// STRICT: Validate sensor reading with exact ranges
// Temperature is NO LONGER from Firebase - it comes from Weather API
function isValidSensorValue(key: string, value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'number') return false;
  if (isNaN(value)) return false;

  // STRICT valid ranges - only pH and DO from ESP32
  switch (key) {
    case 'ph':
      return value >= 0 && value <= 14;
    case 'dissolvedOxygen':
      return value >= 0 && value <= 20;
    default:
      // Unknown sensor - not allowed (temperature no longer from Firebase)
      return false;
  }
}

// STRICT: Parse and validate ONLY pH and DO sensors
// Temperature comes from Weather API, NOT Firebase
function parseSensorData(data: any): FirebaseSensorData {
  if (!data || typeof data !== 'object') {
    return {
      ph: null,
      dissolvedOxygen: null,
    };
  }

  // Parse pH and dissolvedOxygen from common ESP32 key variants
  const phCandidate = data.ph ?? data.pH ?? data.PH ?? data.phValue;
  const dissolvedOxygenCandidate =
    data.dissolvedOxygen ?? data.dissolved_oxygen ?? data.do ?? data.DO ?? data.oxygen;

  return {
    ph: isValidSensorValue('ph', phCandidate) ? Number(phCandidate) : null,
    dissolvedOxygen: isValidSensorValue('dissolvedOxygen', dissolvedOxygenCandidate) ? Number(dissolvedOxygenCandidate) : null,
  };
}

function extractSensorPayload(data: any): any {
  if (!data || typeof data !== 'object') return null;
  if (data.sensors && typeof data.sensors === 'object') return data.sensors;
  if (data.sensor && typeof data.sensor === 'object') return data.sensor;
  if (data.readings && typeof data.readings === 'object') return data.readings;
  if (data.data && typeof data.data === 'object') return data.data;
  if (data.values && typeof data.values === 'object') return data.values;
  if (data.status?.sensors && typeof data.status.sensors === 'object') return data.status.sensors;
  return data;
}

export function useFirebaseSensors(pondId: string): UseFirebaseSensorsResult {
  const [sensorData, setSensorData] = useState<FirebaseSensorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [debugInfo, setDebugInfo] = useState<SensorDebugInfo>({
    firebasePath: '',
    listenerStatus: 'connecting',
    lastDataReceived: null,
    rawData: null,
    errors: [],
  });

  const lastSeenRef = useRef<number | null>(null);
  const staleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestRawByPathRef = useRef<Record<string, any>>({});

  // Build Firebase paths with fallback for firmware variants
  const primaryFirebasePath = `ponds/${pondId}/sensors`;
  const fallbackFirebasePath = `ponds/${pondId}/sensor`;
  const readingsFirebasePath = `ponds/${pondId}/readings`;
  const dataFirebasePath = `ponds/${pondId}/data`;
  const rootFirebasePath = `ponds/${pondId}`;

  // Check if data is stale
  const checkStaleness = useCallback(() => {
    if (lastSeenRef.current) {
      const now = Date.now();
      const age = now - lastSeenRef.current;
      setIsStale(age > STALE_THRESHOLD_MS);
    }
  }, []);

  useEffect(() => {
    if (!database) {
      const errorMsg = 'Firebase database not initialized';
      setError(errorMsg);
      setFirebaseConnected(false);
      setIsLoading(false);
      setDebugInfo(prev => ({
        ...prev,
        firebasePath: primaryFirebasePath,
        listenerStatus: 'error',
        errors: [...prev.errors.slice(-4), errorMsg],
      }));
      return;
    }

    if (!pondId) {
      const errorMsg = 'No pond ID provided';
      setError(errorMsg);
      setIsLoading(false);
      setDebugInfo(prev => ({
        ...prev,
        firebasePath: 'N/A',
        listenerStatus: 'error',
        errors: [...prev.errors.slice(-4), errorMsg],
      }));
      return;
    }

    console.log(
      `[Firebase Sensors] Subscribing to: ${primaryFirebasePath}, ${fallbackFirebasePath}, ${readingsFirebasePath}, ${dataFirebasePath}, ${rootFirebasePath}`
    );
    
    setDebugInfo(prev => ({
      ...prev,
      firebasePath: `${primaryFirebasePath} | ${fallbackFirebasePath} | ${readingsFirebasePath} | ${dataFirebasePath} | ${rootFirebasePath}`,
      listenerStatus: 'connecting',
    }));

    const sensorRefs = [
      { path: primaryFirebasePath, refObj: ref(database, primaryFirebasePath) },
      { path: fallbackFirebasePath, refObj: ref(database, fallbackFirebasePath) },
      { path: readingsFirebasePath, refObj: ref(database, readingsFirebasePath) },
      { path: dataFirebasePath, refObj: ref(database, dataFirebasePath) },
      { path: rootFirebasePath, refObj: ref(database, rootFirebasePath) },
    ];

    const getMergedRawData = () => {
      const primary = latestRawByPathRef.current[primaryFirebasePath];
      const fallback = latestRawByPathRef.current[fallbackFirebasePath];
      const readings = latestRawByPathRef.current[readingsFirebasePath];
      const data = latestRawByPathRef.current[dataFirebasePath];
      const root = latestRawByPathRef.current[rootFirebasePath];

      return (
        extractSensorPayload(primary) ??
        extractSensorPayload(fallback) ??
        extractSensorPayload(readings) ??
        extractSensorPayload(data) ??
        extractSensorPayload(root) ??
        null
      );
    };

    // Real-time listener using onValue
    const handleValue = (path: string, snapshot: any) => {
      try {
        const rawData = snapshot.val();
        const now = new Date();
        latestRawByPathRef.current[path] = rawData;
        const mergedRawData = getMergedRawData();
        
        console.log(`[Firebase Sensors] Data received from ${path} at ${now.toISOString()}:`, rawData);

        setDebugInfo(prev => ({
          ...prev,
          listenerStatus: 'active',
          lastDataReceived: now,
          rawData: mergedRawData,
          errors: [],
        }));

        if (mergedRawData) {
          const parsedData = parseSensorData(mergedRawData);
          setSensorData(parsedData);
          setLastUpdated(now);
          lastSeenRef.current = now.getTime();
          setFirebaseConnected(true);
          setError(null);
          setIsStale(false);
        } else {
          // No data in either path
          setSensorData(null);
          setFirebaseConnected(true);
          setError(null);
          console.log(
            `[Firebase Sensors] No data at paths: ${primaryFirebasePath}, ${fallbackFirebasePath}, ${readingsFirebasePath}, ${dataFirebasePath}, ${rootFirebasePath}`
          );
        }
        
        setIsLoading(false);
      } catch (err) {
        const errorMsg = `Error parsing sensor data: ${err}`;
        console.error('[Firebase Sensors]', errorMsg);
        setError(errorMsg);
        setFirebaseConnected(false);
        setIsLoading(false);
        setDebugInfo(prev => ({
          ...prev,
          listenerStatus: 'error',
          errors: [...prev.errors.slice(-4), errorMsg],
        }));
      }
    };

    const handleError = (err: Error) => {
      const errorMsg = `Firebase connection error: ${err.message}`;
      console.error('[Firebase Sensors]', errorMsg);
      setError(errorMsg);
      setFirebaseConnected(false);
      setIsLoading(false);
      setDebugInfo(prev => ({
        ...prev,
        listenerStatus: 'error',
        errors: [...prev.errors.slice(-4), errorMsg],
      }));
    };

    // Subscribe to real-time updates
    const unsubscribes = sensorRefs.map(({ path, refObj }) =>
      onValue(refObj, (snapshot) => handleValue(path, snapshot), handleError)
    );

    // Set up staleness check interval
    staleCheckIntervalRef.current = setInterval(checkStaleness, 5000);

    // Cleanup
    return () => {
      console.log(
        `[Firebase Sensors] Unsubscribing from: ${primaryFirebasePath}, ${fallbackFirebasePath}, ${readingsFirebasePath}, ${dataFirebasePath}, ${rootFirebasePath}`
      );
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      latestRawByPathRef.current = {};
      setDebugInfo(prev => ({
        ...prev,
        listenerStatus: 'disconnected',
      }));
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
    };
  }, [pondId, primaryFirebasePath, fallbackFirebasePath, readingsFirebasePath, dataFirebasePath, rootFirebasePath, checkStaleness]);

  // Also listen to lastSeen for staleness detection
  useEffect(() => {
    if (!database || !pondId) return;

    const lastSeenPath = `ponds/${pondId}/status/lastSeen`;
    const lastSeenDbRef = ref(database, lastSeenPath);

    const handleLastSeen = (snapshot: any) => {
      const timestamp = snapshot.val();
      if (timestamp) {
        lastSeenRef.current = timestamp;
        checkStaleness();
      }
    };

    const unsubscribe = onValue(lastSeenDbRef, handleLastSeen, () => {});

    return () => unsubscribe();
  }, [pondId, checkStaleness]);

  return { 
    sensorData, 
    isLoading, 
    error, 
    lastUpdated, 
    firebaseConnected,
    isStale,
    debugInfo,
  };
}

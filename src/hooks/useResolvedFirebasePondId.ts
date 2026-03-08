import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { database } from '@/lib/firebase';

interface UseResolvedFirebasePondIdResult {
  resolvedPondId: string;
  isResolving: boolean;
}

function parseTimestampMs(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value < 100000000000 ? value * 1000 : value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric < 100000000000 ? numeric * 1000 : numeric;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }
  return null;
}

function extractSensorPayload(pondData: any): any {
  if (!pondData || typeof pondData !== 'object') return null;
  if (pondData.sensors && typeof pondData.sensors === 'object') return pondData.sensors;
  if (pondData.sensor && typeof pondData.sensor === 'object') return pondData.sensor;
  if (pondData.readings && typeof pondData.readings === 'object') return pondData.readings;
  if (pondData.data && typeof pondData.data === 'object') return pondData.data;
  if (pondData.values && typeof pondData.values === 'object') return pondData.values;
  return pondData;
}

function hasSensorSignal(pondData: any): boolean {
  const payload = extractSensorPayload(pondData);
  if (!payload || typeof payload !== 'object') return false;

  const ph = payload.ph ?? payload.pH ?? payload.PH ?? payload.phValue;
  const doValue = payload.dissolvedOxygen ?? payload.dissolved_oxygen ?? payload.do ?? payload.DO ?? payload.oxygen;

  return typeof ph === 'number' || typeof doValue === 'number';
}

function getLastSeenMs(pondData: any): number | null {
  return (
    parseTimestampMs(pondData?.status?.lastSeen) ??
    parseTimestampMs(pondData?.status?.last_seen) ??
    parseTimestampMs(pondData?.status?.heartbeat) ??
    parseTimestampMs(pondData?.status?.timestamp) ??
    parseTimestampMs(pondData?.lastSeen)
  );
}

function scorePond(pondData: any): number {
  let score = 0;
  if (hasSensorSignal(pondData)) score += 100;
  if (pondData?.sensors || pondData?.sensor) score += 30;
  if (pondData?.devices) score += 20;

  const lastSeenMs = getLastSeenMs(pondData);
  if (lastSeenMs) {
    const ageMs = Date.now() - lastSeenMs;
    if (ageMs <= 60000) score += 40;
    else if (ageMs <= 300000) score += 20;
    else score += 5;
  }

  return score;
}

export function useResolvedFirebasePondId(requestedPondId: string): UseResolvedFirebasePondIdResult {
  const [resolvedPondId, setResolvedPondId] = useState(requestedPondId);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolvePondId = async () => {
      if (!requestedPondId || !database) {
        if (!cancelled) {
          setResolvedPondId(requestedPondId);
          setIsResolving(false);
        }
        return;
      }

      setIsResolving(true);

      try {
        const pondsSnapshot = await get(ref(database, 'ponds'));
        if (!pondsSnapshot.exists()) {
          if (!cancelled) {
            setResolvedPondId(requestedPondId);
            setIsResolving(false);
          }
          return;
        }

        const ponds = pondsSnapshot.val() as Record<string, any>;
        const pondKeys = Object.keys(ponds);
        const requestedExists = !!ponds[requestedPondId];

        let fallbackPondId = requestedPondId;

        const scoredPonds = pondKeys
          .map((key) => ({ key, score: scorePond(ponds[key]) }))
          .sort((a, b) => b.score - a.score);

        const bestScored = scoredPonds[0];

        if (requestedExists && scorePond(ponds[requestedPondId]) > 0) {
          fallbackPondId = requestedPondId;
        } else if (bestScored && bestScored.score > 0) {
          fallbackPondId = bestScored.key;
        } else if (requestedExists) {
          fallbackPondId = requestedPondId;
        } else if (pondKeys.length === 1) {
          fallbackPondId = pondKeys[0];
        } else {
          const generatedPondKeys = pondKeys.filter((key) => key.startsWith('POND_'));
          if (generatedPondKeys.length === 1) {
            fallbackPondId = generatedPondKeys[0];
          }
        }

        if (!cancelled) {
          setResolvedPondId(fallbackPondId);
          setIsResolving(false);
        }
      } catch {
        if (!cancelled) {
          setResolvedPondId(requestedPondId);
          setIsResolving(false);
        }
      }
    };

    resolvePondId();

    return () => {
      cancelled = true;
    };
  }, [requestedPondId]);

  return { resolvedPondId, isResolving };
}

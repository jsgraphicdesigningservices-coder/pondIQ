import { useEffect, useRef, useCallback } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { database, ensureAuth } from '@/lib/firebase';
import { useUserSettings } from './useUserSettings';
import { toast } from 'sonner';

interface ScheduleData {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  daysOfWeek: number[];
  enabled?: boolean;
  isActive?: boolean;
  deviceId?: string;
  deviceName?: string;
  repeat?: string;
}

interface ExecutionRecord {
  action: 'ON' | 'OFF';
  minute: number; // minute-of-day when executed
  day: string;    // YYYY-MM-DD
}

/**
 * Schedule Executor Hook
 * 
 * Runs every 30 seconds and checks if any schedule's start/end time
 * matches the current time. Sends ON command at startTime, OFF at endTime.
 * 
 * Rules:
 * - Auto Mode overrides all schedules (no execution)
 * - Manual commands override active schedules
 * - Only executes on scheduled days
 * - Prevents duplicate execution for the same minute
 */
export function useScheduleExecutor(pondId: string) {
  const { settings } = useUserSettings();
  const executedRef = useRef<Map<string, ExecutionRecord>>(new Map());
  const isExecutingRef = useRef(false);

  const getCurrentTimeInfo = useCallback(() => {
    const now = new Date();
    return {
      day: now.getDay(), // 0=Sun, 6=Sat
      hours: now.getHours(),
      minutes: now.getMinutes(),
      minuteOfDay: now.getHours() * 60 + now.getMinutes(),
      dateStr: now.toISOString().split('T')[0], // YYYY-MM-DD
    };
  }, []);

  const parseTime = useCallback((time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }, []);

  const sendDeviceCommand = useCallback(async (
    deviceType: string,
    state: 0 | 1,
    source: string
  ) => {
    if (!database || !pondId) return false;

    try {
      await ensureAuth().catch(() => {});

      const modeRef = ref(database, `ponds/${pondId}/devices/${deviceType}/mode`);
      const stateRef = ref(database, `ponds/${pondId}/devices/${deviceType}/state`);

      // Check current mode - if manual override is active, skip
      const currentModeSnap = await get(modeRef);
      const currentMode = currentModeSnap.val();
      
      // If device is in manual mode and was manually controlled, respect that
      // Only override if the device mode is not explicitly set to manual by user
      // We set mode to 'manual' when executing schedule commands too
      await set(modeRef, 'manual');
      await set(stateRef, state);

      console.log(`[ScheduleExecutor] ${deviceType} → ${state === 1 ? 'ON' : 'OFF'} (${source})`);
      return true;
    } catch (err) {
      console.error(`[ScheduleExecutor] Failed to send command to ${deviceType}:`, err);
      return false;
    }
  }, [pondId]);

  const executeSchedules = useCallback(async () => {
    if (!database || !pondId || isExecutingRef.current) return;
    
    // Auto Mode overrides all schedules
    if (settings.auto_mode_enabled) return;

    isExecutingRef.current = true;

    try {
      const { day, minuteOfDay, dateStr } = getCurrentTimeInfo();

      // Fetch all schedules from Firebase
      const schedulesRef = ref(database, `ponds/${pondId}/schedules`);
      const snapshot = await get(schedulesRef);
      const data = snapshot.val();

      if (!data) {
        isExecutingRef.current = false;
        return;
      }

      // Iterate through device types and their schedules
      for (const [deviceType, deviceSchedules] of Object.entries(data)) {
        if (!deviceSchedules || typeof deviceSchedules !== 'object') continue;

        for (const [scheduleId, scheduleData] of Object.entries(deviceSchedules as Record<string, ScheduleData>)) {
          if (!scheduleData || typeof scheduleData !== 'object') continue;

          // Skip disabled schedules
          const isEnabled = scheduleData.enabled !== false && scheduleData.isActive !== false;
          if (!isEnabled) continue;

          // Check if today is a scheduled day
          const daysOfWeek = scheduleData.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
          if (!daysOfWeek.includes(day)) continue;

          const startMinute = parseTime(scheduleData.startTime);
          const endMinute = parseTime(scheduleData.endTime);

          // Generate unique execution keys
          const onKey = `${scheduleId}_ON_${dateStr}`;
          const offKey = `${scheduleId}_OFF_${dateStr}`;

          // Check if we should turn ON (within 1 minute of start time)
          if (
            minuteOfDay >= startMinute &&
            minuteOfDay <= startMinute + 1 &&
            !executedRef.current.has(onKey)
          ) {
            const success = await sendDeviceCommand(deviceType, 1, `schedule:${scheduleId}`);
            if (success) {
              executedRef.current.set(onKey, { action: 'ON', minute: minuteOfDay, day: dateStr });
              toast.success(`⏰ Schedule: ${scheduleData.deviceName || deviceType} turned ON`, {
                description: `Scheduled at ${scheduleData.startTime}`,
              });
              
              // Update lastExecuted in Firebase
              const scheduleRef = ref(database, `ponds/${pondId}/schedules/${deviceType}/${scheduleId}/lastExecuted`);
              await set(scheduleRef, Date.now()).catch(() => {});
            }
          }

          // Check if we should turn OFF (within 1 minute of end time)
          if (
            minuteOfDay >= endMinute &&
            minuteOfDay <= endMinute + 1 &&
            !executedRef.current.has(offKey)
          ) {
            const success = await sendDeviceCommand(deviceType, 0, `schedule:${scheduleId}`);
            if (success) {
              executedRef.current.set(offKey, { action: 'OFF', minute: minuteOfDay, day: dateStr });
              toast.info(`⏰ Schedule: ${scheduleData.deviceName || deviceType} turned OFF`, {
                description: `Scheduled at ${scheduleData.endTime}`,
              });
              
              // Update lastExecuted in Firebase
              const scheduleRef = ref(database, `ponds/${pondId}/schedules/${deviceType}/${scheduleId}/lastExecuted`);
              await set(scheduleRef, Date.now()).catch(() => {});

              // Handle 'once' schedules - disable after completion
              if (scheduleData.repeat === 'once') {
                const enabledRef = ref(database, `ponds/${pondId}/schedules/${deviceType}/${scheduleId}/enabled`);
                const activeRef = ref(database, `ponds/${pondId}/schedules/${deviceType}/${scheduleId}/isActive`);
                await set(enabledRef, false).catch(() => {});
                await set(activeRef, false).catch(() => {});
              }
            }
          }
        }
      }

      // Clean up old execution records (keep only today's)
      for (const [key, record] of executedRef.current.entries()) {
        if (record.day !== dateStr) {
          executedRef.current.delete(key);
        }
      }
    } catch (err) {
      console.error('[ScheduleExecutor] Error:', err);
    } finally {
      isExecutingRef.current = false;
    }
  }, [pondId, settings.auto_mode_enabled, getCurrentTimeInfo, parseTime, sendDeviceCommand]);

  // Run executor every 30 seconds
  useEffect(() => {
    if (!pondId || !database) return;

    // Execute immediately on mount
    executeSchedules();

    const interval = setInterval(executeSchedules, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [pondId, executeSchedules]);

  // Clear execution records at midnight
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

    const timeout = setTimeout(() => {
      executedRef.current.clear();
      console.log('[ScheduleExecutor] Cleared execution records at midnight');
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);
}

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { toast } from 'sonner';
import { Schedule, ScheduleStatus, getScheduleStatus } from '@/types/schedule';
import { useUserSettings } from './useUserSettings';

interface UseScheduleManagerReturn {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  addSchedule: (schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<boolean>;
  updateSchedule: (scheduleId: string, updates: Partial<Schedule>) => Promise<boolean>;
  deleteSchedule: (scheduleId: string) => Promise<boolean>;
  toggleSchedule: (scheduleId: string, enabled: boolean) => Promise<boolean>;
  getSchedulesByDevice: (deviceType: string) => Schedule[];
}

export function useScheduleManager(pondId: string): UseScheduleManagerReturn {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { settings } = useUserSettings();

  // Listen to all schedules for this pond
  useEffect(() => {
    if (!database || !pondId) {
      setIsLoading(false);
      return;
    }

    const schedulesRef = ref(database, `ponds/${pondId}/schedules`);

    const unsubscribe = onValue(
      schedulesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Flatten nested device schedules into a single array
          const allSchedules: Schedule[] = [];
          
          Object.entries(data).forEach(([deviceType, deviceSchedules]: [string, any]) => {
            if (typeof deviceSchedules === 'object') {
              Object.entries(deviceSchedules).forEach(([scheduleId, scheduleData]: [string, any]) => {
                if (scheduleData && typeof scheduleData === 'object') {
                  const schedule: Schedule = {
                    id: scheduleId,
                    deviceType,
                    deviceId: scheduleData.deviceId || deviceType,
                    deviceName: scheduleData.deviceName || deviceType,
                    startTime: scheduleData.startTime || '00:00',
                    endTime: scheduleData.endTime || '00:00',
                    repeat: scheduleData.repeat || 'daily',
                    daysOfWeek: scheduleData.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
                    enabled: scheduleData.enabled !== false && scheduleData.isActive !== false,
                    createdAt: scheduleData.createdAt || Date.now(),
                    updatedAt: scheduleData.updatedAt || Date.now(),
                    lastExecuted: scheduleData.lastExecuted,
                    nextExecution: scheduleData.nextExecution,
                  };
                  schedule.status = getScheduleStatus(schedule);
                  allSchedules.push(schedule);
                }
              });
            }
          });

          // Sort by device type then start time
          allSchedules.sort((a, b) => {
            if (a.deviceType !== b.deviceType) {
              return a.deviceType.localeCompare(b.deviceType);
            }
            return a.startTime.localeCompare(b.startTime);
          });

          setSchedules(allSchedules);
        } else {
          setSchedules([]);
        }
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching schedules:', err);
        setError('Failed to load schedules');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pondId]);

  // Update schedule statuses every minute
  useEffect(() => {
    if (schedules.length === 0) return;

    const interval = setInterval(() => {
      setSchedules(prev => 
        prev.map(s => ({
          ...s,
          status: getScheduleStatus(s),
        }))
      );
    }, 60000);

    return () => clearInterval(interval);
  }, [schedules.length]);

  const addSchedule = useCallback(async (
    scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<boolean> => {
    if (!database || !pondId) return false;

    setIsSaving(true);
    try {
      const schedulesRef = ref(database, `ponds/${pondId}/schedules/${scheduleData.deviceType}`);
      const newRef = push(schedulesRef);
      
      const newSchedule = {
        ...scheduleData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: scheduleData.enabled,
      };

      await set(newRef, newSchedule);
      toast.success('Schedule added successfully');
      return true;
    } catch (err) {
      console.error('Error adding schedule:', err);
      toast.error('Failed to add schedule');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [pondId]);

  const updateSchedule = useCallback(async (
    scheduleId: string,
    updates: Partial<Schedule>
  ): Promise<boolean> => {
    if (!database || !pondId) return false;

    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return false;

    setIsSaving(true);
    try {
      const scheduleRef = ref(database, `ponds/${pondId}/schedules/${schedule.deviceType}/${scheduleId}`);
      
      await update(scheduleRef, {
        ...updates,
        updatedAt: Date.now(),
        isActive: updates.enabled ?? schedule.enabled,
      });
      
      toast.success('Schedule updated');
      return true;
    } catch (err) {
      console.error('Error updating schedule:', err);
      toast.error('Failed to update schedule');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [pondId, schedules]);

  const deleteSchedule = useCallback(async (scheduleId: string): Promise<boolean> => {
    if (!database || !pondId) return false;

    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return false;

    setIsSaving(true);
    try {
      const scheduleRef = ref(database, `ponds/${pondId}/schedules/${schedule.deviceType}/${scheduleId}`);
      await remove(scheduleRef);
      toast.success('Schedule removed');
      return true;
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast.error('Failed to remove schedule');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [pondId, schedules]);

  const toggleSchedule = useCallback(async (
    scheduleId: string,
    enabled: boolean
  ): Promise<boolean> => {
    // Check if auto mode is active - disable schedules when auto mode is on
    if (settings.auto_mode_enabled && enabled) {
      toast.warning('Schedules are disabled during Auto Mode');
      return false;
    }

    return updateSchedule(scheduleId, { enabled });
  }, [updateSchedule, settings.auto_mode_enabled]);

  const getSchedulesByDevice = useCallback((deviceType: string): Schedule[] => {
    return schedules.filter(s => s.deviceType === deviceType);
  }, [schedules]);

  return {
    schedules,
    isLoading,
    error,
    isSaving,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
    getSchedulesByDevice,
  };
}

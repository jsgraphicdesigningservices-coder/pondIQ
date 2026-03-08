import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";

interface Schedule {
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

interface NextScheduleInfo {
  time: string;
  action: "ON" | "OFF";
  display: string;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getNextScheduledTime(schedules: Schedule[]): NextScheduleInfo | null {
  if (!schedules || schedules.length === 0) return null;

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let closestEvent: { time: string; action: "ON" | "OFF"; minutesUntil: number } | null = null;

  // Check active schedules
  const activeSchedules = schedules.filter((s) => s.isActive);
  
  if (activeSchedules.length === 0) return null;

  for (const schedule of activeSchedules) {
    const startMinutes = parseTimeToMinutes(schedule.startTime);
    const endMinutes = parseTimeToMinutes(schedule.endTime);

    // Check for today and next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDay = (currentDay + dayOffset) % 7;

      if (!schedule.daysOfWeek.includes(checkDay)) continue;

      // Calculate minutes until start time
      let minutesUntilStart = startMinutes - currentMinutes + dayOffset * 1440;
      if (dayOffset === 0 && startMinutes <= currentMinutes) {
        minutesUntilStart += 7 * 1440; // Next week same day
      }

      // Calculate minutes until end time
      let minutesUntilEnd = endMinutes - currentMinutes + dayOffset * 1440;
      if (dayOffset === 0 && endMinutes <= currentMinutes) {
        minutesUntilEnd += 7 * 1440;
      }

      // Check start event
      if (!closestEvent || minutesUntilStart < closestEvent.minutesUntil) {
        closestEvent = {
          time: schedule.startTime,
          action: "ON",
          minutesUntil: minutesUntilStart,
        };
      }

      // Check end event
      if (!closestEvent || minutesUntilEnd < closestEvent.minutesUntil) {
        closestEvent = {
          time: schedule.endTime,
          action: "OFF",
          minutesUntil: minutesUntilEnd,
        };
      }
    }
  }

  if (!closestEvent) return null;

  return {
    time: closestEvent.time,
    action: closestEvent.action,
    display: `${formatTime12h(closestEvent.time)} - ${closestEvent.action}`,
  };
}

export function useDeviceSchedule(pondId: string, deviceType: string) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [nextSchedule, setNextSchedule] = useState<NextScheduleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!pondId || !deviceType || !database) return;

    const scheduleRef = ref(database, `ponds/${pondId}/schedules/${deviceType}`);

    const unsubscribe = onValue(
      scheduleRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Handle both array and object formats
          const scheduleList: Schedule[] = Array.isArray(data)
            ? data
            : Object.values(data);
          setSchedules(scheduleList);
          setNextSchedule(getNextScheduledTime(scheduleList));
        } else {
          setSchedules([]);
          setNextSchedule(null);
        }
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pondId, deviceType]);

  // Update next schedule every minute
  useEffect(() => {
    if (schedules.length === 0) return;

    const interval = setInterval(() => {
      setNextSchedule(getNextScheduledTime(schedules));
    }, 60000);

    return () => clearInterval(interval);
  }, [schedules]);

  return {
    schedules,
    nextSchedule,
    isLoading,
    hasSchedules: schedules.length > 0,
  };
}

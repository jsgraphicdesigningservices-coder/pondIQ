// Schedule Types for Firebase-based scheduling system

export interface Schedule {
  id: string;
  deviceId: string;
  deviceType: string;
  deviceName: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  repeat: 'once' | 'daily' | 'custom';
  daysOfWeek: number[]; // 0-6, Sunday-Saturday
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  // Status tracking
  status?: ScheduleStatus;
  lastExecuted?: number;
  nextExecution?: number;
}

export type ScheduleStatus = 'upcoming' | 'running' | 'completed' | 'disabled' | 'pending';

export interface ScheduleExecutionLog {
  id: string;
  scheduleId: string;
  deviceId: string;
  action: 'ON' | 'OFF';
  executedAt: number;
  success: boolean;
  source: 'schedule' | 'manual' | 'auto';
  message?: string;
}

export interface PondAccess {
  userId: string;
  role: 'admin' | 'operator' | 'viewer';
  grantedAt: number;
  grantedBy: string;
}

export interface PondConfig {
  id: string;
  name: string;
  ownerId: string;
  deviceIp: string;
  location?: string;
  timezone?: string;
  createdAt: number;
  // Access control
  access?: Record<string, PondAccess>;
}

// Device pairing
export interface PairingCode {
  code: string;
  pondId: string;
  pondName: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// Days of week helpers
export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKENDS = [0, 6];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function formatDays(days: number[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map(d => DAYS_OF_WEEK[d]).join(', ');
}

export function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getScheduleStatus(schedule: Schedule): ScheduleStatus {
  if (!schedule.enabled) return 'disabled';
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  // Check if today is in the schedule
  if (!schedule.daysOfWeek.includes(currentDay)) {
    return 'upcoming';
  }
  
  // Check if currently running
  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return 'running';
  }
  
  // Check if completed for today
  if (currentMinutes >= endMinutes) {
    return 'completed';
  }
  
  return 'upcoming';
}

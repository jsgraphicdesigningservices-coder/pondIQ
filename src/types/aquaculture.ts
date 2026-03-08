// STRICT: Only 3 sensors allowed - temperature, ph, dissolvedOxygen
export interface SensorData {
  ph: number;
  dissolvedOxygen: number;
  temperature: number;
  timestamp: Date;
}

export interface SensorStatus {
  value: number;
  status: 'safe' | 'warning' | 'critical';
  unit: string;
  label: string;
  min: number;
  max: number;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  isOn: boolean;
  isAuto: boolean;
  icon: string;
  autoCondition?: string;
}

export interface Pond {
  id: string;
  name: string;
  ipAddress: string;
  location?: string;
  fishType?: string;
  capacity?: number;
  status: 'online' | 'offline' | 'warning' | 'critical';
  lastUpdated: Date;
  sensors?: SensorData;
  devices?: Device[];
}

export interface Alert {
  id: string;
  pondId: string;
  pondName: string;
  type: 'ph' | 'do' | 'temperature' | 'device' | 'system';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  ponds: string[];
  createdAt: Date;
}

export interface Schedule {
  id: string;
  deviceId: string;
  pondId: string;
  action: 'on' | 'off';
  time: string;
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  enabled: boolean;
}

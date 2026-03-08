import { useEffect, useRef, useCallback } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useUserSettings } from './useUserSettings';
import { toast } from 'sonner';

interface SensorData {
  temperature: number;
  ph: number;
  dissolvedOxygen: number;
  turbidity?: number;
}

interface CriticalCondition {
  type: 'low_do' | 'high_temp' | 'low_temp' | 'abnormal_ph';
  severity: 'warning' | 'critical';
  message: string;
  action?: 'aerator_on' | 'motor_on' | 'alert_only';
}

// Validate sensor data to filter invalid readings
function isValidSensorData(data: SensorData): boolean {
  // Filter -127 temperature (disconnected sensor)
  if (data.temperature <= -100 || data.temperature > 50) return false;
  // Filter negative pH/DO
  if (data.ph < 0 || data.ph > 14) return false;
  if (data.dissolvedOxygen < 0 || data.dissolvedOxygen > 20) return false;
  return true;
}

export function useCriticalAutoMode(pondId: string) {
  const { settings } = useUserSettings();
  const lastConditionsRef = useRef<string[]>([]);
  const autoActivatedDevicesRef = useRef<Set<string>>(new Set());

  const checkCriticalConditions = useCallback((sensors: SensorData): CriticalCondition[] => {
    if (!isValidSensorData(sensors)) return [];

    const conditions: CriticalCondition[] = [];
    const { temp_min, temp_max, ph_min, ph_max, do_min } = settings;

    // Low Dissolved Oxygen
    if (sensors.dissolvedOxygen < do_min) {
      conditions.push({
        type: 'low_do',
        severity: sensors.dissolvedOxygen < do_min - 1 ? 'critical' : 'warning',
        message: `Low DO: ${sensors.dissolvedOxygen.toFixed(1)} mg/L`,
        action: 'aerator_on',
      });
    }

    // High Temperature
    if (sensors.temperature > temp_max) {
      conditions.push({
        type: 'high_temp',
        severity: sensors.temperature > temp_max + 3 ? 'critical' : 'warning',
        message: `High Temp: ${sensors.temperature.toFixed(1)}°C`,
        action: 'motor_on',
      });
    }

    // Low Temperature
    if (sensors.temperature < temp_min) {
      conditions.push({
        type: 'low_temp',
        severity: sensors.temperature < temp_min - 3 ? 'critical' : 'warning',
        message: `Low Temp: ${sensors.temperature.toFixed(1)}°C`,
        action: 'alert_only',
      });
    }

    // Abnormal pH
    if (sensors.ph < ph_min || sensors.ph > ph_max) {
      conditions.push({
        type: 'abnormal_ph',
        severity: sensors.ph < ph_min - 0.5 || sensors.ph > ph_max + 0.5 ? 'critical' : 'warning',
        message: `Abnormal pH: ${sensors.ph.toFixed(2)}`,
        action: 'alert_only',
      });
    }

    return conditions;
  }, [settings]);

  const activateDevice = useCallback(async (deviceType: string) => {
    if (!database || !settings.auto_mode_enabled) return;

    try {
      const deviceRef = ref(database, `ponds/${pondId}/devices/${deviceType}`);
      await set(deviceRef, { state: 1, mode: 'auto' });
      autoActivatedDevicesRef.current.add(deviceType);
      console.log(`[AutoMode] Activated ${deviceType} for pond ${pondId}`);
    } catch (err) {
      console.error(`Error activating ${deviceType}:`, err);
    }
  }, [pondId, settings.auto_mode_enabled]);

  const deactivateAutoDevices = useCallback(async () => {
    if (!database) return;

    for (const deviceType of autoActivatedDevicesRef.current) {
      try {
        const deviceRef = ref(database, `ponds/${pondId}/devices/${deviceType}`);
        await set(deviceRef, { state: 0, mode: 'manual' });
        console.log(`[AutoMode] Deactivated ${deviceType} for pond ${pondId}`);
      } catch (err) {
        console.error(`Error deactivating ${deviceType}:`, err);
      }
    }
    autoActivatedDevicesRef.current.clear();
  }, [pondId]);

  useEffect(() => {
    if (!database || !settings.auto_mode_enabled) return;

    const sensorsRef = ref(database, `ponds/${pondId}/sensors`);

    const unsubscribe = onValue(sensorsRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const sensors: SensorData = {
        temperature: data.temperature ?? 0,
        ph: data.ph ?? 0,
        dissolvedOxygen: data.dissolvedOxygen ?? 0,
        turbidity: data.turbidity ?? 0,
      };

      const conditions = checkCriticalConditions(sensors);
      const conditionKeys = conditions.map(c => c.type);

      // Check if conditions changed
      const prevKeys = lastConditionsRef.current;
      const hasNewConditions = conditionKeys.some(k => !prevKeys.includes(k));
      const conditionsResolved = prevKeys.length > 0 && conditionKeys.length === 0;

      if (hasNewConditions && settings.alerts_enabled) {
        // New critical condition detected
        for (const condition of conditions) {
          if (!prevKeys.includes(condition.type)) {
            // Show alert
            if (condition.severity === 'critical') {
              toast.error(condition.message, { duration: 10000 });
            } else {
              toast.warning(condition.message, { duration: 5000 });
            }

            // Execute auto action
            if (condition.action === 'aerator_on') {
              await activateDevice('aerator');
            } else if (condition.action === 'motor_on') {
              await activateDevice('motor');
            }
          }
        }
      }

      // Conditions resolved - deactivate auto devices
      if (conditionsResolved) {
        toast.success('Sensor values returned to safe range');
        await deactivateAutoDevices();
      }

      lastConditionsRef.current = conditionKeys;
    });

    return () => unsubscribe();
  }, [pondId, settings.auto_mode_enabled, settings.alerts_enabled, checkCriticalConditions, activateDevice, deactivateAutoDevices]);

  return {
    isAutoModeActive: settings.auto_mode_enabled,
    autoActivatedDevices: Array.from(autoActivatedDevicesRef.current),
  };
}

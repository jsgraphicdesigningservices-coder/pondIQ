import { useState, useCallback } from 'react';
import { ref, set, onValue, off } from 'firebase/database';
import { database, ensureAuth } from '@/lib/firebase';

export type CommandStatus = 'idle' | 'sending' | 'sent' | 'acknowledged' | 'error';

interface UseDeviceCommandReturn {
  status: CommandStatus;
  sendCommand: (pondId: string, deviceType: string, state: 0 | 1, mode?: 'manual' | 'auto') => Promise<boolean>;
}

export function useDeviceCommand(): UseDeviceCommandReturn {
  const [status, setStatus] = useState<CommandStatus>('idle');

  const sendCommand = useCallback(async (
    pondId: string,
    deviceType: string,
    state: 0 | 1,
    mode: 'manual' | 'auto' = 'manual'
  ): Promise<boolean> => {
    if (!database) {
      setStatus('error');
      return false;
    }

    setStatus('sending');

    try {
      // Try to ensure auth, but don't block if it fails
      // Firebase rules will reject unauthorized writes anyway
      await ensureAuth().catch(() => {
        console.log('Auth not available, attempting write anyway');
      });

      // IMPORTANT: Match the exact paths the rest of the app (and security rules) expect.
      // Do NOT overwrite `ponds/{pondId}/devices/{deviceType}` with an object.
      const modeRef = ref(database, `ponds/${pondId}/devices/${deviceType}/mode`);
      const stateRef = ref(database, `ponds/${pondId}/devices/${deviceType}/state`);

      await set(modeRef, mode);
      await set(stateRef, state);
      
      setStatus('sent');

      // Listen for acknowledgment from ESP32
      const ackRef = ref(database, `ponds/${pondId}/devices/${deviceType}/ack`);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          off(ackRef);
          // Even without ack, command was sent
          setStatus('sent');
          resolve(true);
        }, 3000); // 3 second timeout for ack

        onValue(ackRef, (snapshot) => {
          const ackTime = snapshot.val();
          if (ackTime && Date.now() - ackTime < 5000) {
            clearTimeout(timeout);
            off(ackRef);
            setStatus('acknowledged');
            resolve(true);
          }
        });
      });
    } catch (err) {
      console.error('Command error:', err);
      setStatus('error');
      return false;
    }
  }, []);

  return { status, sendCommand };
}

// Status display helper
export function getCommandStatusDisplay(status: CommandStatus): { text: string; color: string } {
  switch (status) {
    case 'sending':
      return { text: 'Sending...', color: 'text-muted-foreground' };
    case 'sent':
      return { text: 'Command Sent', color: 'text-primary' };
    case 'acknowledged':
      return { text: 'Device Acknowledged', color: 'text-status-safe' };
    case 'error':
      return { text: 'Command Failed', color: 'text-destructive' };
    default:
      return { text: '', color: '' };
  }
}

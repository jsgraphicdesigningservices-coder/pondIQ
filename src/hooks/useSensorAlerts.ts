import { useEffect, useRef, useCallback } from 'react';

type SensorStatus = 'safe' | 'warning' | 'critical';

// Audio context for generating alert sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const playAlertSound = (status: SensorStatus) => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different frequencies for different alert levels
    if (status === 'warning') {
      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } else if (status === 'critical') {
      // More urgent double-beep for critical
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
      
      // Second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 880;
        osc2.type = 'square';
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.15);
      }, 200);
    }
  } catch (error) {
    console.log('Audio not available');
  }
};

const triggerVibration = (status: SensorStatus) => {
  if (!navigator.vibrate) return;
  
  try {
    if (status === 'warning') {
      navigator.vibrate([100, 50, 100]); // Short double vibration
    } else if (status === 'critical') {
      navigator.vibrate([200, 100, 200, 100, 200]); // Longer triple vibration
    }
  } catch (error) {
    console.log('Vibration not available');
  }
};

export function useSensorAlerts(status: SensorStatus, enabled: boolean = true) {
  const lastAlertStatus = useRef<SensorStatus>('safe');
  const lastAlertTime = useRef<number>(0);
  const ALERT_COOLDOWN = 10000; // 10 seconds between alerts

  const triggerAlert = useCallback((newStatus: SensorStatus) => {
    const now = Date.now();
    
    // Only alert if status changed to warning/critical and cooldown passed
    if (
      newStatus !== 'safe' &&
      (newStatus !== lastAlertStatus.current || now - lastAlertTime.current > ALERT_COOLDOWN)
    ) {
      playAlertSound(newStatus);
      triggerVibration(newStatus);
      lastAlertStatus.current = newStatus;
      lastAlertTime.current = now;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      triggerAlert(status);
    }
  }, [status, enabled, triggerAlert]);

  return { triggerAlert };
}

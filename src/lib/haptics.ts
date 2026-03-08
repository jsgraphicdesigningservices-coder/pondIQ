import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      // Haptics not available, fail silently
    }
  }
};

export const triggerHapticLight = () => triggerHaptic(ImpactStyle.Light);
export const triggerHapticMedium = () => triggerHaptic(ImpactStyle.Medium);
export const triggerHapticHeavy = () => triggerHaptic(ImpactStyle.Heavy);

import { useState, useCallback } from 'react';
import { ref, set, get, update } from 'firebase/database';
import { database, ensureAuth } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PairingResult {
  success: boolean;
  pondId?: string;
  error?: string;
}

interface UseDevicePairingReturn {
  isPairing: boolean;
  linkPondToOwner: (pondId: string, name: string, deviceIp: string, location?: string) => Promise<PairingResult>;
  regeneratePondId: (oldPondId: string, pondName: string) => Promise<string | null>;
  verifyPairing: (pondId: string) => Promise<boolean>;
}

export function useDevicePairing(): UseDevicePairingReturn {
  const [isPairing, setIsPairing] = useState(false);
  const { user } = useAuth();

  // Link an existing ESP32 Pond ID to the current user's account
  const linkPondToOwner = useCallback(async (
    pondId: string,
    name: string,
    deviceIp: string,
    location?: string
  ): Promise<PairingResult> => {
    if (!user) {
      toast.error('You must be logged in to link a device');
      return { success: false, error: 'Not authenticated' };
    }

    if (!pondId.trim()) {
      toast.error('Pond ID is required');
      return { success: false, error: 'Pond ID is required' };
    }

    setIsPairing(true);
    try {
      const normalizedPondId = pondId.trim().toUpperCase();
      const firebaseUser = await ensureAuth();

      if (!firebaseUser) {
        throw new Error('Firebase authentication failed. Enable Anonymous auth in Firebase Console, then click Recheck Auth and try pairing again.');
      }

      const firebaseUid = firebaseUser.uid;

      // Check if this pond ID already exists and is owned by someone else
      if (database) {
        const existingPond = await get(ref(database, `ponds/${normalizedPondId}`));
        if (existingPond.exists()) {
          const data = existingPond.val();
          const existingOwnerFirebaseUid = data.ownerUid;
          const existingOwnerSupabaseUid = data.ownerSupabaseUid;
          if (
            existingOwnerFirebaseUid &&
            existingOwnerFirebaseUid !== firebaseUid &&
            existingOwnerSupabaseUid !== user.id
          ) {
            throw new Error('This Pond ID is already linked to another account');
          }
        }
      }

      // 1. Create in Supabase
      const { error: supabaseError } = await supabase.from('ponds').insert({
        name,
        device_ip: deviceIp,
        location: location || null,
        user_id: user.id,
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // 2. Initialize/update in Firebase with owner credentials
      // IMPORTANT: Security rules use Firebase auth.uid, not Supabase uid.
      if (database) {
        const pondRef = ref(database, `ponds/${normalizedPondId}`);
        const existingPond = await get(pondRef);

        if (existingPond.exists()) {
          await update(pondRef, {
            name,
            ownerUid: firebaseUid,
            ownerSupabaseUid: user.id,
            ownerEmail: user.email,
            deviceIp,
            location: location || null,
            linkedAt: Date.now(),
            'config/paired': true,
            'config/pairedAt': Date.now(),
            [`access/${firebaseUid}/role`]: 'admin',
            [`access/${firebaseUid}/grantedAt`]: Date.now(),
            [`access/${firebaseUid}/grantedBy`]: firebaseUid,
            [`access/${firebaseUid}/grantedBySupabaseUid`]: user.id,
          });
        } else {
          await set(pondRef, {
            name,
            ownerUid: firebaseUid,
            ownerSupabaseUid: user.id,
            ownerEmail: user.email,
            deviceIp,
            location: location || null,
            createdAt: Date.now(),
            linkedAt: Date.now(),
            status: {
              online: false,
              lastSeen: null,
            },
            sensors: {
              ph: 0,
              dissolvedOxygen: 0,
            },
            devices: {
              motor: { state: 0, mode: 'manual' },
              aerator: { state: 0, mode: 'manual' },
              light: { state: 0, mode: 'manual' },
            },
            schedules: {},
            config: {
              paired: true,
              pairedAt: Date.now(),
            },
            access: {
              [firebaseUid]: {
                role: 'admin',
                grantedAt: Date.now(),
                grantedBy: firebaseUid,
                grantedBySupabaseUid: user.id,
              },
            },
          });
        }
      }

      toast.success('Device linked successfully! You are now the owner.');
      return { success: true, pondId: normalizedPondId };
    } catch (err) {
      console.error('Error linking pond:', err);
      const message = err instanceof Error ? err.message : 'Failed to link device';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsPairing(false);
    }
  }, [user]);

  // Regenerate a new Pond ID for an existing pond (migrate data)
  const regeneratePondId = useCallback(async (
    oldPondId: string,
    pondName: string
  ): Promise<string | null> => {
    if (!database || !user) return null;

    try {
      // Generate new pond ID
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 6);
      const newPondId = `POND_${timestamp}_${randomPart}`.toUpperCase();
      
      // Get existing pond data
      const existingData = await get(ref(database, `ponds/${oldPondId}`));
      if (!existingData.exists()) {
        throw new Error('Pond not found');
      }

      const data = existingData.val();
      
      // Verify ownership
      if (data.ownerUid !== user.id) {
        throw new Error('You do not own this pond');
      }

      // Create new pond with same data but new ID
      await set(ref(database, `ponds/${newPondId}`), {
        ...data,
        previousPondId: oldPondId,
        regeneratedAt: Date.now(),
      });

      // Mark old pond as migrated (don't delete for audit trail)
      await set(ref(database, `ponds/${oldPondId}/migratedTo`), newPondId);
      await set(ref(database, `ponds/${oldPondId}/migratedAt`), Date.now());

      toast.success(`New Pond ID generated: ${newPondId}`);
      return newPondId;
    } catch (err) {
      console.error('Error regenerating pond ID:', err);
      const message = err instanceof Error ? err.message : 'Failed to regenerate pond ID';
      toast.error(message);
      return null;
    }
  }, [user]);

  const verifyPairing = useCallback(async (pondId: string): Promise<boolean> => {
    if (!database) return false;

    try {
      const snapshot = await get(ref(database, `ponds/${pondId}/config/paired`));
      return snapshot.val() === true;
    } catch (err) {
      console.error('Error verifying pairing:', err);
      return false;
    }
  }, []);

  return {
    isPairing,
    linkPondToOwner,
    regeneratePondId,
    verifyPairing,
  };
}

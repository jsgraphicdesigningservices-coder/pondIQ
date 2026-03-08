import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PondAccess } from '@/types/schedule';

export type UserRole = 'admin' | 'operator' | 'viewer';

interface UsePondAccessReturn {
  userRole: UserRole | null;
  accessList: PondAccess[];
  isLoading: boolean;
  canControl: boolean; // admin or operator
  canView: boolean;    // all roles
  isAdmin: boolean;
  addAccess: (userId: string, role: UserRole) => Promise<boolean>;
  updateAccess: (userId: string, role: UserRole) => Promise<boolean>;
  removeAccess: (userId: string) => Promise<boolean>;
}

export function usePondAccess(pondId: string): UsePondAccessReturn {
  const { user } = useAuth();
  const [accessList, setAccessList] = useState<PondAccess[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!database || !pondId || !user) {
      setIsLoading(false);
      return;
    }

    const accessRef = ref(database, `ponds/${pondId}/access`);

    const unsubscribe = onValue(
      accessRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list: PondAccess[] = Object.entries(data).map(([userId, access]: [string, any]) => ({
            userId,
            role: access.role || 'viewer',
            grantedAt: access.grantedAt || Date.now(),
            grantedBy: access.grantedBy || '',
          }));
          
          setAccessList(list);
          
          // Find current user's role
          const currentUserAccess = list.find(a => a.userId === user.id);
          setUserRole(currentUserAccess?.role || null);
        } else {
          setAccessList([]);
          setUserRole(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching access:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pondId, user]);

  const addAccess = useCallback(async (userId: string, role: UserRole): Promise<boolean> => {
    if (!database || !pondId || !user || userRole !== 'admin') {
      toast.error('Only admins can manage access');
      return false;
    }

    try {
      await set(ref(database, `ponds/${pondId}/access/${userId}`), {
        role,
        grantedAt: Date.now(),
        grantedBy: user.id,
      });
      toast.success('Access granted');
      return true;
    } catch (err) {
      console.error('Error adding access:', err);
      toast.error('Failed to grant access');
      return false;
    }
  }, [pondId, user, userRole]);

  const updateAccess = useCallback(async (userId: string, role: UserRole): Promise<boolean> => {
    if (!database || !pondId || !user || userRole !== 'admin') {
      toast.error('Only admins can manage access');
      return false;
    }

    try {
      await update(ref(database, `ponds/${pondId}/access/${userId}`), {
        role,
      });
      toast.success('Access updated');
      return true;
    } catch (err) {
      console.error('Error updating access:', err);
      toast.error('Failed to update access');
      return false;
    }
  }, [pondId, user, userRole]);

  const removeAccess = useCallback(async (userId: string): Promise<boolean> => {
    if (!database || !pondId || !user || userRole !== 'admin') {
      toast.error('Only admins can manage access');
      return false;
    }

    // Prevent removing self if admin
    if (userId === user.id) {
      toast.error('Cannot remove your own access');
      return false;
    }

    try {
      await remove(ref(database, `ponds/${pondId}/access/${userId}`));
      toast.success('Access removed');
      return true;
    } catch (err) {
      console.error('Error removing access:', err);
      toast.error('Failed to remove access');
      return false;
    }
  }, [pondId, user, userRole]);

  return {
    userRole,
    accessList,
    isLoading,
    canControl: userRole === 'admin' || userRole === 'operator',
    canView: userRole !== null,
    isAdmin: userRole === 'admin',
    addAccess,
    updateAccess,
    removeAccess,
  };
}

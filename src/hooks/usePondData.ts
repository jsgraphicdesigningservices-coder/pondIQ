import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pond, SensorData, Device, Alert } from '@/types/aquaculture';
import { useFirebaseDevices } from './useFirebaseDevices';
import { useFirebaseSensors } from './useFirebaseSensors';
import { useFirebaseAlerts } from './useFirebaseAlerts';
import { useFirebasePondStatus } from './useFirebasePondStatus';
import { useAuth } from '@/contexts/AuthContext';

export interface PondWithOwnership extends Pond {
  ownerUid?: string;
  ownerEmail?: string;
  isOwner?: boolean;
}

export function usePondData() {
  const { user, isAdmin } = useAuth();
  const [ponds, setPonds] = useState<PondWithOwnership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPonds = useCallback(async () => {
    if (!user) {
      setPonds([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Supabase RLS handles access control:
      // - Normal users see only their ponds (user_id = auth.uid())
      // - Admins see all ponds (has_role check)
      const { data, error: fetchError } = await supabase
        .from('ponds')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedPonds: PondWithOwnership[] = (data || []).map((pond) => ({
        id: pond.id,
        name: pond.name,
        ipAddress: pond.device_ip,
        location: pond.location || undefined,
        status: 'online' as const,
        lastUpdated: new Date(pond.updated_at),
        ownerUid: pond.user_id,
        isOwner: pond.user_id === user.id,
      }));

      setPonds(mappedPonds);
    } catch (err) {
      console.error('Error fetching ponds:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ponds');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchPonds();
  }, [fetchPonds]);

  // Subscribe to realtime changes on ponds table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('ponds-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ponds',
        },
        () => {
          // Refetch when ponds table changes
          fetchPonds();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPonds]);

  return { ponds, isLoading, error, refetch: fetchPonds, firebaseConnected: true };
}

export function useSensorData(pondId: string = 'pond1', readOnly: boolean = false) {
  // Use Firebase sensor hook with dynamic pondId
  const { 
    sensorData: firebaseSensorData, 
    isLoading: sensorsLoading, 
    error: sensorsError, 
    lastUpdated,
    firebaseConnected: sensorsConnected,
    isStale,
    debugInfo,
  } = useFirebaseSensors(pondId);

  // Use Firebase devices hook with dynamic pondId and readOnly support
  const { 
    devices, 
    isLoading: devicesLoading,
    error: devicesError,
    firebaseConnected: devicesConnected,
    toggleDevice,
    setDeviceAuto,
  } = useFirebaseDevices(pondId, readOnly);

  // STRICT: Only map pH and DO sensors - temperature comes from Weather API
  const sensorData: SensorData | null = firebaseSensorData ? {
    ph: firebaseSensorData.ph ?? 0,
    dissolvedOxygen: firebaseSensorData.dissolvedOxygen ?? 0,
    temperature: 0, // Temperature now comes from Weather API, not Firebase
    timestamp: lastUpdated || new Date(),
  } : null;

  const refreshData = useCallback(() => {
    console.log('Refresh requested - Firebase provides realtime updates');
  }, []);

  return { 
    sensorData, 
    devices, 
    isLoading: sensorsLoading || devicesLoading, 
    lastUpdated: lastUpdated || new Date(), 
    refreshData, 
    toggleDevice, 
    setDeviceAuto, 
    error: sensorsError || devicesError, 
    firebaseConnected: sensorsConnected || devicesConnected,
    isStale,
    debugInfo,
  };
}

export function useAlerts(pondIdFilter?: string) {
  const { 
    alerts: firebaseAlerts, 
    isLoading, 
    error, 
    firebaseConnected,
    acknowledgeAlert: fbAcknowledgeAlert,
  } = useFirebaseAlerts();

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await fbAcknowledgeAlert(alertId);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  }, [fbAcknowledgeAlert]);

  return { 
    alerts: firebaseAlerts, 
    isLoading, 
    acknowledgeAlert, 
    refetch: () => {}, 
    firebaseConnected 
  };
}

// Admin hooks for fetching all data
export function useAdminData() {
  const [users, setUsers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    pondCount: number;
    status: string;
  }>>([]);
  const [allPonds, setAllPonds] = useState<Array<{
    id: string;
    name: string;
    ip: string;
    status: string;
    userName: string;
  }>>([]);
  const [systemAlerts, setSystemAlerts] = useState<Array<{
    id: string;
    message: string;
    time: string;
    severity: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: pondsData, error: pondsError } = await supabase
        .from('ponds')
        .select('*')
        .order('created_at', { ascending: false });

      if (pondsError) throw pondsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select('*, ponds(name)')
        .order('triggered_at', { ascending: false })
        .limit(10);

      if (alertsError) throw alertsError;

      const pondsByUser = (pondsData || []).reduce((acc, pond) => {
        acc[pond.user_id] = (acc[pond.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const rolesByUser = (rolesData || []).reduce((acc, role) => {
        acc[role.user_id] = role.role;
        return acc;
      }, {} as Record<string, string>);

      const mappedUsers = (profilesData || []).map(profile => ({
        id: profile.user_id,
        name: profile.full_name || 'Unknown',
        email: profile.user_id,
        role: rolesByUser[profile.user_id] || 'user',
        pondCount: pondsByUser[profile.user_id] || 0,
        status: 'active',
      }));

      const mappedPonds = (pondsData || []).map(pond => {
        const ownerProfile = (profilesData || []).find(p => p.user_id === pond.user_id);
        return {
          id: pond.id,
          name: pond.name,
          ip: pond.device_ip,
          status: 'online',
          userName: ownerProfile?.full_name || 'Unknown',
        };
      });

      const mappedAlerts = (alertsData || []).map(alert => ({
        id: alert.id,
        message: alert.message,
        time: formatTimeAgo(new Date(alert.triggered_at)),
        severity: alert.severity,
      }));

      setUsers(mappedUsers);
      setAllPonds(mappedPonds);
      setSystemAlerts(mappedAlerts);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return { users, allPonds, systemAlerts, isLoading, error, refetch: fetchAdminData };
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}

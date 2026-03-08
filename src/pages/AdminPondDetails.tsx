import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSensorData } from '@/hooks/usePondData';
import { useFirebaseAlerts } from '@/hooks/useFirebaseAlerts';
import { useFirebasePondStatus } from '@/hooks/useFirebasePondStatus';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SensorCard } from '@/components/SensorCard';
import { 
  Loader2, 
  Droplets, 
  Wind,
  Lightbulb,
  Bell,
  User,
  MapPin,
  Wifi,
  WifiOff,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PondDetails {
  id: string;
  name: string;
  device_ip: string;
  location: string | null;
  created_at: string;
  user_id: string;
}

interface OwnerProfile {
  full_name: string | null;
  user_id: string;
  created_at: string;
}

export default function AdminPondDetails() {
  const { pondId } = useParams<{ pondId: string }>();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [pond, setPond] = useState<PondDetails | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use Firebase hooks for real-time data with readOnly=true for admin
  const { 
    sensorData, 
    devices, 
    isLoading: sensorLoading, 
    lastUpdated,
    firebaseConnected 
  } = useSensorData(pondId || 'pond1', true); // readOnly = true for admin

  const { 
    alerts: firebaseAlerts, 
    isLoading: alertsLoading,
  } = useFirebaseAlerts();

  const pondStatus = useFirebasePondStatus();

  const fetchPondDetails = useCallback(async () => {
    if (!pondId) return;
    
    try {
      setIsLoading(true);

      // Fetch pond details
      const { data: pondData, error: pondError } = await supabase
        .from('ponds')
        .select('*')
        .eq('id', pondId)
        .maybeSingle();

      if (pondError) throw pondError;
      if (!pondData) {
        navigate('/admin');
        return;
      }

      setPond(pondData);

      // Fetch owner profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', pondData.user_id)
        .maybeSingle();

      setOwner(profileData);

    } catch (error) {
      console.error('Error fetching pond details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pondId, navigate]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchPondDetails();
    }
  }, [authLoading, isAdmin, fetchPondDetails]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate('/admin');
    return null;
  }

  if (!pond) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Pond not found</p>
      </div>
    );
  }

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'aerator': return Wind;
      case 'pump': 
      case 'motor': return Droplets;
      case 'lights':
      case 'light': return Lightbulb;
      case 'buzzer': return Bell;
      default: return Activity;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title={pond.name} showBack />

      <main className="p-4 max-w-4xl mx-auto">
        {/* Pond Info Card */}
        <Card variant="elevated" className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {pondStatus.isOnline ? (
                    <Wifi className="h-4 w-4 text-status-safe" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-status-warning" />
                  )}
                  <span className="text-sm font-mono">{pond.device_ip}</span>
                </div>
                {pond.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{pond.location}</span>
                  </div>
                )}
              </div>
              <Badge 
                variant="secondary" 
                className={cn(
                  pondStatus.isOnline 
                    ? 'bg-status-safe/10 text-status-safe' 
                    : 'bg-status-warning/10 text-status-warning'
                )}
              >
                {pondStatus.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Owner Profile Card */}
        <Card variant="elevated" className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Pond Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                {(owner?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{owner?.full_name || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(owner?.created_at || pond.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="sensors" className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-3">
            <TabsTrigger value="sensors">Sensors</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="sensors" className="mt-0">
            {sensorLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sensorData ? (
              <div className="grid gap-4">
                <SensorCard
                  type="ph"
                  value={+sensorData.ph.toFixed(2)}
                />
                <SensorCard
                  type="do"
                  value={+sensorData.dissolvedOxygen.toFixed(2)}
                />
                <SensorCard
                  type="temperature"
                  value={+sensorData.temperature.toFixed(1)}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No sensor data available
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center mt-4">
              Read-only view • {firebaseConnected ? 'Live data from Firebase' : 'Using cached data'} 
              {lastUpdated && ` • Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </TabsContent>

          {/* Devices Tab - Read Only */}
          <TabsContent value="devices" className="mt-0">
            <Card variant="elevated">
              <CardContent className="p-4">
                {devices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No devices configured for this pond
                  </div>
                ) : (
                  <div className="space-y-3">
                    {devices.map(device => {
                      const Icon = getDeviceIcon(device.type);
                      return (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'h-10 w-10 rounded-xl flex items-center justify-center',
                              device.isOn ? 'bg-status-safe/10' : 'bg-muted'
                            )}>
                              <Icon className={cn(
                                'h-5 w-5',
                                device.isOn ? 'text-status-safe' : 'text-muted-foreground'
                              )} />
                            </div>
                            <div>
                              <p className="font-medium">{device.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{device.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {device.isAuto && (
                              <Badge variant="secondary" className="text-xs">AUTO</Badge>
                            )}
                            <Badge variant={device.isOn ? 'default' : 'secondary'}>
                              {device.isOn ? 'ON' : 'OFF'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Read-only view • Device controls disabled for admin
            </p>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-0">
            <Card variant="elevated">
              <CardContent className="p-4">
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : firebaseAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No alerts for this pond
                  </div>
                ) : (
                  <div className="space-y-3">
                    {firebaseAlerts.map(alert => (
                      <div
                        key={alert.id}
                        className={cn(
                          'p-4 rounded-xl border-l-4',
                          alert.severity === 'warning'
                            ? 'border-l-status-warning bg-status-warning/5'
                            : alert.severity === 'critical'
                            ? 'border-l-status-critical bg-status-critical/5'
                            : 'border-l-primary bg-primary/5'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn(
                            'h-5 w-5 mt-0.5',
                            alert.severity === 'critical' ? 'text-status-critical' :
                            alert.severity === 'warning' ? 'text-status-warning' : 'text-primary'
                          )} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{alert.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(alert.timestamp).toLocaleString()}
                              </span>
                              <Badge 
                                variant={!alert.acknowledged ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {!alert.acknowledged ? 'Active' : 'Acknowledged'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

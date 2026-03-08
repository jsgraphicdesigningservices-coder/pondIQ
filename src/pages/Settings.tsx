import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DevicePairingDialog } from '@/components/DevicePairingDialog';
import { OwnershipTransferDialog } from '@/components/OwnershipTransferDialog';
import { RegeneratePondIdDialog } from '@/components/RegeneratePondIdDialog';
import { HowItWorksInfo } from '@/components/HowItWorksInfo';
import { usePondData } from '@/hooks/usePondData';
import { useUserSettings } from '@/hooks/useUserSettings';
import { motion } from 'framer-motion';
import { 
  Sliders, 
  Waves, 
  User, 
  Bell, 
  Shield, 
  ChevronRight,
  Trash2,
  MapPin,
  UserCog,
  Wifi,
  Zap,
  Hand,
  Loader2,
  Plus,
  CloudSun,
  Thermometer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const navigate = useNavigate();
  const { ponds, refetch } = usePondData();
  const { settings, isLoading: settingsLoading, updateSettings, syncToFirebase } = useUserSettings();

  const handleDeletePond = async (pondId: string, pondName: string) => {
    try {
      await supabase.from('device_schedules').delete().eq('device_id', pondId);
      await supabase.from('devices').delete().eq('pond_id', pondId);
      await supabase.from('alerts').delete().eq('pond_id', pondId);
      await supabase.from('sensor_readings').delete().eq('pond_id', pondId);
      
      const { error } = await supabase.from('ponds').delete().eq('id', pondId);
      
      if (error) throw error;
      
      toast.success(`${pondName} has been removed`);
      refetch();
    } catch (error) {
      console.error('Error deleting pond:', error);
      toast.error('Failed to delete pond');
    }
  };

  const handleToggleSetting = async (key: keyof typeof settings, value: boolean) => {
    try {
      await updateSettings({ [key]: value });
      
      // Sync to Firebase for all ponds
      for (const pond of ponds) {
        await syncToFirebase(pond.id);
      }
      
      toast.success('Setting updated');
    } catch (err) {
      toast.error('Failed to update setting');
    }
  };

  const settingItems = [
    {
      icon: Sliders,
      title: 'Threshold Settings',
      description: 'Configure sensor warning and critical levels',
      path: '/settings/thresholds',
    },
    {
      icon: User,
      title: 'Profile',
      description: 'Manage your account information',
      path: '/profile',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure alert preferences',
      path: '/settings/notifications',
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Password and security settings',
      path: '/settings/security',
    },
  ];

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header alertCount={0} />
      
      <main className="p-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>

          {/* Feature Toggles Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">System Controls</h3>
            <div className="space-y-3">
              {/* Auto Mode Toggle */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Auto Mode</h4>
                        <p className="text-xs text-muted-foreground">
                          Automatically control devices during critical sensor conditions
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.auto_mode_enabled}
                      onCheckedChange={(checked) => handleToggleSetting('auto_mode_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Alerts toggle temporarily disabled
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Alerts</h4>
                        <p className="text-xs text-muted-foreground">
                          Sound and vibration alerts for critical conditions
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.alerts_enabled}
                      onCheckedChange={(checked) => handleToggleSetting('alerts_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
              */}

              {/* Manual Override Toggle */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Hand className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Manual Override</h4>
                        <p className="text-xs text-muted-foreground">
                          Allow manual control even during auto mode
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.manual_override}
                      onCheckedChange={(checked) => handleToggleSetting('manual_override', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Weather Temperature Toggle */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                        <CloudSun className="h-5 w-5 text-sky-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Weather-Based Temperature</h4>
                        <p className="text-xs text-muted-foreground">
                          Get ambient temperature from weather service
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.weather_temp_enabled}
                      onCheckedChange={(checked) => handleToggleSetting('weather_temp_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Weather Configuration (shown when weather temp is enabled) */}
              {settings.weather_temp_enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="border-sky-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Thermometer className="h-4 w-4" />
                        Weather Configuration
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Configure weather-based temperature source
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">Location (City or GPS)</Label>
                        <Input
                          placeholder="Manila, Philippines"
                          value={settings.weather_location || ''}
                          onChange={(e) => updateSettings({ weather_location: e.target.value })}
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter city name or coordinates (e.g., "Manila" or "14.5995,120.9842")
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">Temperature Unit</Label>
                        <div className="flex gap-2 mt-1">
                          <Button
                            variant={settings.temp_unit === 'celsius' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSettings({ temp_unit: 'celsius' })}
                            className="flex-1"
                          >
                            °C Celsius
                          </Button>
                          <Button
                            variant={settings.temp_unit === 'fahrenheit' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateSettings({ temp_unit: 'fahrenheit' })}
                            className="flex-1"
                          >
                            °F Fahrenheit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </section>

          {/* Pond Management Section */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Your Ponds</h3>
              </div>
              <DevicePairingDialog onSuccess={() => refetch()} />
            </div>
            
            <div className="space-y-3">
              {ponds.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Waves className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No ponds added yet</p>
                    <DevicePairingDialog onSuccess={() => refetch()} />
                  </CardContent>
                </Card>
              ) : (
                ponds.map((pond, index) => (
                  <motion.div
                    key={pond.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                            onClick={() => navigate(`/pond/${pond.id}`)}
                          >
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Waves className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground truncate">{pond.name}</h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {pond.location || 'No location'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Wifi className="h-3 w-3" />
                                  {pond.ipAddress}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {/* Regenerate Pond ID Button */}
                            <RegeneratePondIdDialog
                              pondId={pond.id}
                              pondName={pond.name}
                              onRegenerate={() => refetch()}
                            />
                            
                            {/* Ownership Transfer Button */}
                            <OwnershipTransferDialog
                              pondId={pond.id}
                              pondName={pond.name}
                              onTransferComplete={() => refetch()}
                            />
                            
                            {/* Delete Button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {pond.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the pond and all associated data including sensor readings, devices, schedules, and alerts. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePond(pond.id, pond.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Pond
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* General Settings Section */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">General Settings</h3>
            <div className="space-y-2">
              {settingItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (ponds.length + index) * 0.05 }}
                >
                <Card 
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
                    onClick={() => navigate(item.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}

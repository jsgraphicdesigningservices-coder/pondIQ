import { useState } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  BellRing, 
  Smartphone, 
  Mail, 
  AlertTriangle,
  Droplets,
  Thermometer,
  Wind,
  Volume2,
  VolumeX,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  iconColor: string;
}

export default function Notifications() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  const [alertSettings, setAlertSettings] = useState<NotificationSetting[]>([
    {
      id: 'critical',
      title: 'Critical Alerts',
      description: 'Low oxygen, extreme pH, temperature danger',
      icon: AlertTriangle,
      enabled: true,
      iconColor: 'text-status-critical'
    },
    {
      id: 'warning',
      title: 'Warning Alerts',
      description: 'Parameters approaching thresholds',
      icon: BellRing,
      enabled: true,
      iconColor: 'text-status-warning'
    },
    {
      id: 'dissolved_oxygen',
      title: 'Dissolved Oxygen',
      description: 'DO level changes and alerts',
      icon: Wind,
      enabled: true,
      iconColor: 'text-primary'
    },
    {
      id: 'temperature',
      title: 'Temperature',
      description: 'Temperature fluctuation alerts',
      icon: Thermometer,
      enabled: true,
      iconColor: 'text-orange-500'
    },
    {
      id: 'ph',
      title: 'pH Level',
      description: 'pH imbalance notifications',
      icon: Droplets,
      enabled: false,
      iconColor: 'text-blue-500'
    }
  ]);

  const toggleAlert = (id: string) => {
    setAlertSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const handleSaveSettings = () => {
    toast.success('Notification settings saved!');
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Notifications" showBack />
      
      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 mb-2"
        >
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Bell className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Notification Settings</h2>
            <p className="text-sm text-muted-foreground">Manage your alert preferences</p>
          </div>
        </motion.div>

        {/* Delivery Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Delivery Methods
          </h3>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0 divide-y divide-border">
              {/* Push Notifications */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive alerts on your device</p>
                  </div>
                </div>
                <Switch 
                  checked={pushEnabled} 
                  onCheckedChange={setPushEnabled}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Email */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Email Alerts</p>
                    <p className="text-xs text-muted-foreground">Get notifications via email</p>
                  </div>
                </div>
                <Switch 
                  checked={emailEnabled} 
                  onCheckedChange={setEmailEnabled}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>

              {/* Sound */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center',
                    soundEnabled ? 'bg-violet-500/10' : 'bg-muted'
                  )}>
                    {soundEnabled ? (
                      <Volume2 className="h-5 w-5 text-violet-500" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Alert Sounds</p>
                    <p className="text-xs text-muted-foreground">Play sound for alerts</p>
                  </div>
                </div>
                <Switch 
                  checked={soundEnabled} 
                  onCheckedChange={setSoundEnabled}
                  className="data-[state=checked]:bg-violet-500"
                />
              </div>

              {/* Quiet Hours */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center',
                    quietHours ? 'bg-indigo-500/10' : 'bg-muted'
                  )}>
                    <Clock className={cn(
                      'h-5 w-5',
                      quietHours ? 'text-indigo-500' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Quiet Hours</p>
                    <p className="text-xs text-muted-foreground">10 PM - 6 AM (except critical)</p>
                  </div>
                </div>
                <Switch 
                  checked={quietHours} 
                  onCheckedChange={setQuietHours}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alert Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Alert Types
          </h3>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0 divide-y divide-border">
              {alertSettings.map((setting, index) => (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 + index * 0.05 }}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center',
                      setting.enabled ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <setting.icon className={cn(
                        'h-5 w-5',
                        setting.enabled ? setting.iconColor : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <p className={cn(
                        'font-medium',
                        setting.enabled ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {setting.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={setting.enabled} 
                    onCheckedChange={() => toggleAlert(setting.id)}
                    className="data-[state=checked]:bg-primary"
                  />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Button 
            onClick={handleSaveSettings}
            className="w-full h-14 rounded-2xl text-lg font-semibold shadow-lg"
          >
            Save Settings
          </Button>
        </motion.div>
      </main>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Device } from '@/types/aquaculture';
import { Wind, Droplets, Lightbulb, Bell, Zap, Power } from 'lucide-react';
import { motion } from 'framer-motion';

const iconMap = {
  Wind: Wind,
  Droplets: Droplets,
  Lightbulb: Lightbulb,
  Bell: Bell,
};

interface DeviceControlProps {
  device: Device;
  onToggle: (deviceId: string) => void;
  onAutoChange: (deviceId: string, isAuto: boolean) => void;
  className?: string;
}

export function DeviceControl({ device, onToggle, onAutoChange, className }: DeviceControlProps) {
  const Icon = iconMap[device.icon as keyof typeof iconMap] || Wind;

  return (
    <Card className={cn('overflow-hidden border-0 shadow-lg', className)}>
      <CardContent className="p-0">
        <div className="flex flex-col">
          {/* Main Control Area */}
          <div className="p-5 flex items-center gap-4">
            {/* Large Power Button */}
            <motion.button
              onClick={() => onToggle(device.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'relative h-20 w-20 rounded-3xl flex items-center justify-center transition-all duration-300 shadow-xl',
                device.isOn
                  ? 'bg-gradient-to-br from-status-safe to-emerald-600'
                  : 'bg-gradient-to-br from-status-critical to-red-700'
              )}
              style={{
                boxShadow: device.isOn
                  ? '0 10px 40px -10px hsl(var(--status-safe) / 0.5)'
                  : '0 10px 40px -10px hsl(var(--status-critical) / 0.5)'
              }}
            >
              {/* Animated ring when ON */}
              {/* Animated ring */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-3xl border-2",
                  device.isOn ? "border-status-safe" : "border-status-critical"
                )}
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0.5, 0], scale: [1, 1.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <Power className="h-8 w-8 text-white transition-colors" />
            </motion.button>

            {/* Device Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  'h-8 w-8 rounded-xl flex items-center justify-center',
                  device.isOn 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-lg text-foreground">{device.name}</h3>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full transition-colors',
                    device.isOn
                      ? 'bg-status-safe/15 text-status-safe'
                      : 'bg-status-critical/15 text-status-critical'
                  )}
                >
                  <motion.span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      device.isOn ? 'bg-status-safe' : 'bg-status-critical'
                    )}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  {device.isOn ? 'Running' : 'Stopped'}
                </span>
                
                {device.isAuto && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-device-auto/15 text-device-auto">
                    <Zap className="h-3.5 w-3.5" />
                    AUTO
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Auto Mode Toggle Bar */}
          {device.autoCondition && (
            <div className={cn(
              'px-5 py-3 border-t transition-colors',
              device.isAuto ? 'bg-device-auto/5 border-device-auto/20' : 'bg-muted/30 border-border'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={cn(
                    'h-4 w-4',
                    device.isAuto ? 'text-device-auto' : 'text-muted-foreground'
                  )} />
                  <span className="text-sm font-medium text-foreground">Auto Mode</span>
                </div>
                
                <motion.button
                  onClick={() => onAutoChange(device.id, !device.isAuto)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative h-10 w-20 rounded-full transition-all duration-300 shadow-inner',
                    device.isAuto
                      ? 'bg-device-auto'
                      : 'bg-muted'
                  )}
                >
                  <motion.div
                    className="absolute top-1 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center"
                    animate={{ left: device.isAuto ? 'calc(100% - 36px)' : '4px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {device.isAuto ? (
                      <Zap className="h-4 w-4 text-device-auto" />
                    ) : (
                      <Power className="h-4 w-4 text-muted-foreground" />
                    )}
                  </motion.div>
                </motion.button>
              </div>
              
              {device.isAuto && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-xs text-muted-foreground mt-2 pl-6"
                >
                  Triggers: {device.autoCondition}
                </motion.p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { usePondData } from '@/hooks/usePondData';
import { useScheduleManager } from '@/hooks/useScheduleManager';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useResolvedFirebasePondId } from '@/hooks/useResolvedFirebasePondId';
import { Header } from '@/components/Header';
import { ScheduleStatusBadge } from '@/components/ScheduleStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Clock,
  Plus,
  Loader2,
  Zap,
  Bell,
  Trash2,
  Edit2,
  Save,
  X,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Schedule, DAYS_OF_WEEK, formatDays, formatTime12h, WEEKDAYS, ALL_DAYS } from '@/types/schedule';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const deviceConfig = [
  // { type: 'motor', name: 'Water Pump', icon: Droplets },
  { type: 'aerator', name: 'Power', icon: Zap },
  // { type: 'light', name: 'Lights', icon: Lightbulb },
];

const repeatOptions = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'custom', label: 'Custom Days' },
];

export default function DeviceSchedules() {
  const { pondId } = useParams<{ pondId: string }>();
  const navigate = useNavigate();
  const { ponds, isLoading: pondsLoading } = usePondData();
  const { settings } = useUserSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedDevice, setSelectedDevice] = useState('');

  const pond = ponds.find(p => p.id === pondId) || (ponds.length === 1 ? ponds[0] : null);
  const stablePondId = pondId || pond?.id || 'pond1';
  const { resolvedPondId } = useResolvedFirebasePondId(stablePondId);

  const { 
    schedules, 
    isLoading: schedulesLoading, 
    isSaving,
    addSchedule, 
    updateSchedule, 
    deleteSchedule, 
    toggleSchedule 
  } = useScheduleManager(resolvedPondId);

  const [newSchedule, setNewSchedule] = useState({
    deviceType: '',
    startTime: '08:00',
    endTime: '18:00',
    repeat: 'daily' as 'once' | 'daily' | 'custom',
    daysOfWeek: WEEKDAYS as number[],
  });

  if (pondsLoading || schedulesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pond) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Pond Not Found</h2>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const toggleDay = (day: number) => {
    setNewSchedule(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.deviceType) {
      toast.error('Please select a device');
      return;
    }

    const device = deviceConfig.find(d => d.type === newSchedule.deviceType);
    
    const success = await addSchedule({
      deviceType: newSchedule.deviceType,
      deviceId: newSchedule.deviceType,
      deviceName: device?.name || newSchedule.deviceType,
      startTime: newSchedule.startTime,
      endTime: newSchedule.endTime,
      repeat: newSchedule.repeat,
      daysOfWeek: newSchedule.repeat === 'daily' ? ALL_DAYS : newSchedule.daysOfWeek,
      enabled: true,
    });

    if (success) {
      setIsDialogOpen(false);
      setNewSchedule({
        deviceType: '',
        startTime: '08:00',
        endTime: '18:00',
        repeat: 'daily',
        daysOfWeek: WEEKDAYS,
      });
    }
  };

  const handleToggle = async (scheduleId: string, enabled: boolean) => {
    await toggleSchedule(scheduleId, enabled);
  };

  const handleDelete = async (scheduleId: string) => {
    await deleteSchedule(scheduleId);
  };

  // Group schedules by device
  const schedulesByDevice = deviceConfig.map(device => ({
    ...device,
    schedules: schedules.filter(s => s.deviceType === device.type),
  }));

  const activeSchedulesCount = schedules.filter(s => s.enabled).length;

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Schedules" showBack />
      
      <main className="p-4 max-w-lg mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{pond.name}</h2>
              <p className="text-xs text-muted-foreground">
                {activeSchedulesCount} active schedules
              </p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl" disabled={isSaving}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Schedule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Device</Label>
                  <Select
                    value={newSchedule.deviceType}
                    onValueChange={(value) => setNewSchedule(prev => ({ ...prev, deviceType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceConfig.map(device => (
                        <SelectItem key={device.type} value={device.type}>
                          <div className="flex items-center gap-2">
                            <device.icon className="h-4 w-4" />
                            {device.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newSchedule.endTime}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Repeat</Label>
                  <Select
                    value={newSchedule.repeat}
                    onValueChange={(value: 'once' | 'daily' | 'custom') => setNewSchedule(prev => ({ ...prev, repeat: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {repeatOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newSchedule.repeat === 'custom' && (
                  <div className="space-y-2">
                    <Label>Days</Label>
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map((day, index) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(index)}
                          className={cn(
                            'w-9 h-9 rounded-lg text-xs font-medium transition-colors',
                            newSchedule.daysOfWeek.includes(index)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleAddSchedule} 
                  className="w-full" 
                  disabled={!newSchedule.deviceType || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Auto Mode Warning */}
        {settings.auto_mode_enabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="border-status-warning/30 bg-status-warning/10">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-warning flex-shrink-0" />
                <p className="text-xs text-status-warning">
                  Schedules are paused during Auto Mode. Device control is automatic based on sensor readings.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Schedule Execution</p>
                <ul className="space-y-0.5">
                  <li>• Schedules run on your local time — devices turn ON/OFF exactly at the set times</li>
                  <li>• Manual commands override active schedules</li>
                  <li>• Auto Mode overrides all schedules</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule List by Device */}
        <div className="space-y-4">
          {schedulesByDevice.map((device, deviceIndex) => (
            <motion.div
              key={device.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: deviceIndex * 0.1 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <device.icon className="h-4 w-4 text-primary" />
                    </div>
                    {device.name}
                    <Badge variant="secondary" className="ml-auto">
                      {device.schedules.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {device.schedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No schedules for this device
                    </p>
                  ) : (
                    device.schedules.map((schedule) => (
                      <motion.div
                        key={schedule.id}
                        layout
                        className={cn(
                          'p-3 rounded-lg border transition-all',
                          schedule.enabled ? 'bg-card' : 'bg-muted/30 opacity-60'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatTime12h(schedule.startTime)} – {formatTime12h(schedule.endTime)}
                            </span>
                            {schedule.status && (
                              <ScheduleStatusBadge status={schedule.status} />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={schedule.enabled}
                              onCheckedChange={(checked) => handleToggle(schedule.id, checked)}
                              disabled={isSaving || settings.auto_mode_enabled}
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  disabled={isSaving}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove the schedule for {device.name} ({formatTime12h(schedule.startTime)} – {formatTime12h(schedule.endTime)}).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(schedule.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {formatDays(schedule.daysOfWeek)}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            {schedule.repeat}
                          </Badge>
                        </div>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {schedules.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No schedules configured</p>
            <p className="text-xs text-muted-foreground/70 mb-4">
              Add a schedule to automate device operation
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Schedule
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}

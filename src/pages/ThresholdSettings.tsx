import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  FlaskConical,
  Droplets,
  Thermometer,
  Save,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUserSettings } from '@/hooks/useUserSettings';
import { usePondData } from '@/hooks/usePondData';

export default function ThresholdSettings() {
  const navigate = useNavigate();
  const { settings, isLoading, updateSettings, syncToFirebase } = useUserSettings();
  const { ponds } = usePondData();
  
  const [localSettings, setLocalSettings] = useState({
    temp_min: 25,
    temp_max: 32,
    ph_min: 6.5,
    ph_max: 8.5,
    do_min: 5.0,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state with loaded settings
  useEffect(() => {
    if (!isLoading) {
      setLocalSettings({
        temp_min: settings.temp_min,
        temp_max: settings.temp_max,
        ph_min: settings.ph_min,
        ph_max: settings.ph_max,
        do_min: settings.do_min,
      });
    }
  }, [settings, isLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      
      // Sync to Firebase for all ponds
      for (const pond of ponds) {
        await syncToFirebase(pond.id);
      }
      
      toast.success('Thresholds saved and synced to devices');
    } catch (err) {
      toast.error('Failed to save thresholds');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings({
      temp_min: 25,
      temp_max: 32,
      ph_min: 6.5,
      ph_max: 8.5,
      do_min: 5.0,
    });
    toast.info('Thresholds reset to defaults');
  };

  const updateField = (field: keyof typeof localSettings, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    setLocalSettings(prev => ({ ...prev, [field]: numValue }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Threshold Settings" showBack />
      
      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* pH Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <FlaskConical className="h-4 w-4 text-violet-600" />
                </div>
                pH Level
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Min (Safe)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={localSettings.ph_min}
                    onChange={(e) => updateField('ph_min', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max (Safe)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={localSettings.ph_max}
                    onChange={(e) => updateField('ph_max', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Values outside this range will trigger alerts
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dissolved Oxygen Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Droplets className="h-4 w-4 text-blue-600" />
                </div>
                Dissolved Oxygen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Minimum (mg/L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={localSettings.do_min}
                  onChange={(e) => updateField('do_min', e.target.value)}
                  className="h-9 max-w-[150px]"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Below this value: Aerator turns ON automatically (if Auto Mode enabled)
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Temperature Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Thermometer className="h-4 w-4 text-orange-600" />
                </div>
                Temperature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Min (°C)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={localSettings.temp_min}
                    onChange={(e) => updateField('temp_min', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max (°C)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={localSettings.temp_max}
                    onChange={(e) => updateField('temp_max', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                High temperature: Motor turns ON automatically (if Auto Mode enabled)
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex gap-3 pt-2"
        >
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </motion.div>
      </main>
    </div>
  );
}

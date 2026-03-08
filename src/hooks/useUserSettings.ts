import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { toast } from 'sonner';

export interface UserSettings {
  id?: string;
  user_id?: string;
  // Thresholds
  temp_min: number;
  temp_max: number;
  ph_min: number;
  ph_max: number;
  do_min: number;
  // Feature toggles
  auto_mode_enabled: boolean;
  alerts_enabled: boolean;
  camera_enabled: boolean;
  manual_override: boolean;
  // Camera
  camera_ip: string | null;
  camera_rtsp_url: string | null;
  // Weather settings
  weather_temp_enabled: boolean;
  weather_location: string | null;
  temp_unit: 'celsius' | 'fahrenheit';
}

const defaultSettings: UserSettings = {
  temp_min: 25,
  temp_max: 32,
  ph_min: 6.5,
  ph_max: 8.5,
  do_min: 5.0,
  auto_mode_enabled: false,
  alerts_enabled: true,
  camera_enabled: false,
  manual_override: true,
  camera_ip: null,
  camera_rtsp_url: null,
  weather_temp_enabled: true,
  weather_location: null,
  temp_unit: 'celsius',
};

interface UseUserSettingsReturn {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  syncToFirebase: (pondId: string) => Promise<void>;
}

export function useUserSettings(): UseUserSettingsReturn {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        setUserId(user.id);

        const { data, error: fetchError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setSettings({
            id: data.id,
            user_id: data.user_id,
            temp_min: Number(data.temp_min),
            temp_max: Number(data.temp_max),
            ph_min: Number(data.ph_min),
            ph_max: Number(data.ph_max),
            do_min: Number(data.do_min),
            auto_mode_enabled: data.auto_mode_enabled,
            alerts_enabled: data.alerts_enabled,
            camera_enabled: data.camera_enabled,
            manual_override: data.manual_override,
            camera_ip: data.camera_ip,
            camera_rtsp_url: data.camera_rtsp_url,
            weather_temp_enabled: (data as any).weather_temp_enabled ?? true,
            weather_location: (data as any).weather_location ?? null,
            temp_unit: ((data as any).temp_unit as 'celsius' | 'fahrenheit') ?? 'celsius',
          });
        } else {
          // Create default settings for new user
          const { data: newData, error: insertError } = await supabase
            .from('user_settings')
            .insert({
              user_id: user.id,
              ...defaultSettings,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          
          if (newData) {
            setSettings({
              id: newData.id,
              user_id: newData.user_id,
              temp_min: Number(newData.temp_min),
              temp_max: Number(newData.temp_max),
              ph_min: Number(newData.ph_min),
              ph_max: Number(newData.ph_max),
              do_min: Number(newData.do_min),
              auto_mode_enabled: newData.auto_mode_enabled,
              alerts_enabled: newData.alerts_enabled,
              camera_enabled: newData.camera_enabled,
              manual_override: newData.manual_override,
              camera_ip: newData.camera_ip,
              camera_rtsp_url: newData.camera_rtsp_url,
              weather_temp_enabled: (newData as any).weather_temp_enabled ?? true,
              weather_location: (newData as any).weather_location ?? null,
              temp_unit: ((newData as any).temp_unit as 'celsius' | 'fahrenheit') ?? 'celsius',
            });
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchSettings();
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!userId) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          temp_min: newSettings.temp_min,
          temp_max: newSettings.temp_max,
          ph_min: newSettings.ph_min,
          ph_max: newSettings.ph_max,
          do_min: newSettings.do_min,
          auto_mode_enabled: newSettings.auto_mode_enabled,
          alerts_enabled: newSettings.alerts_enabled,
          camera_enabled: newSettings.camera_enabled,
          manual_override: newSettings.manual_override,
          camera_ip: newSettings.camera_ip,
          camera_rtsp_url: newSettings.camera_rtsp_url,
          weather_temp_enabled: newSettings.weather_temp_enabled,
          weather_location: newSettings.weather_location,
          temp_unit: newSettings.temp_unit,
        } as any)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error updating settings:', err);
      toast.error('Failed to save settings');
      throw err;
    }
  }, [userId, settings]);

  // Sync thresholds and auto_mode to Firebase for ESP32 access
  const syncToFirebase = useCallback(async (pondId: string) => {
    if (!database) return;

    try {
      await set(ref(database, `ponds/${pondId}/config`), {
        thresholds: {
          temp_min: settings.temp_min,
          temp_max: settings.temp_max,
          ph_min: settings.ph_min,
          ph_max: settings.ph_max,
          do_min: settings.do_min,
        },
        auto_mode_enabled: settings.auto_mode_enabled,
        alerts_enabled: settings.alerts_enabled,
      });
    } catch (err) {
      console.error('Error syncing to Firebase:', err);
    }
  }, [settings]);

  return { settings, isLoading, error, updateSettings, syncToFirebase };
}

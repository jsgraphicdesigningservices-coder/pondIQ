-- Create user_settings table for thresholds and feature toggles
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Threshold settings
  temp_min NUMERIC NOT NULL DEFAULT 25,
  temp_max NUMERIC NOT NULL DEFAULT 32,
  ph_min NUMERIC NOT NULL DEFAULT 6.5,
  ph_max NUMERIC NOT NULL DEFAULT 8.5,
  do_min NUMERIC NOT NULL DEFAULT 5.0,
  -- Feature toggles
  auto_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  camera_enabled BOOLEAN NOT NULL DEFAULT false,
  manual_override BOOLEAN NOT NULL DEFAULT true,
  -- Camera settings
  camera_ip TEXT,
  camera_rtsp_url TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
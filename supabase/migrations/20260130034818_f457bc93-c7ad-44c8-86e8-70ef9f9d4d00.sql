-- Add weather-related settings to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS weather_temp_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS weather_location text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS temp_unit text DEFAULT 'celsius' CHECK (temp_unit IN ('celsius', 'fahrenheit'));
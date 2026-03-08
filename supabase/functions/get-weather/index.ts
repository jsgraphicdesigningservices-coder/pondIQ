import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherResponse {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  location: string;
  timestamp: number;
  unit: 'celsius' | 'fahrenheit';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    if (!OPENWEATHER_API_KEY) {
      console.error('OPENWEATHER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Weather API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const location = url.searchParams.get('location');
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const unit = url.searchParams.get('unit') || 'celsius';

    if (!location && (!lat || !lon)) {
      return new Response(
        JSON.stringify({ error: 'Either location or lat/lon coordinates required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OpenWeather uses 'metric' for Celsius, 'imperial' for Fahrenheit
    const units = unit === 'fahrenheit' ? 'imperial' : 'metric';
    
    let weatherUrl: string;
    if (lat && lon) {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${OPENWEATHER_API_KEY}`;
    } else {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location!)}&units=${units}&appid=${OPENWEATHER_API_KEY}`;
    }

    console.log(`Fetching weather for: ${location || `${lat},${lon}`}`);

    const response = await fetch(weatherUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error('OpenWeather API error:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to fetch weather data' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weatherData: WeatherResponse = {
      temperature: Math.round(data.main.temp * 10) / 10,
      feelsLike: Math.round(data.main.feels_like * 10) / 10,
      humidity: data.main.humidity,
      description: data.weather[0]?.description || 'Unknown',
      icon: data.weather[0]?.icon || '01d',
      location: `${data.name}, ${data.sys.country}`,
      timestamp: Date.now(),
      unit: unit as 'celsius' | 'fahrenheit',
    };

    console.log('Weather data:', weatherData);

    return new Response(
      JSON.stringify(weatherData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
        } 
      }
    );
  } catch (error) {
    console.error('Error fetching weather:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

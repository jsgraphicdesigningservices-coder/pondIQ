import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  location: string;
  timestamp: number;
  unit: 'celsius' | 'fahrenheit';
}

interface UseWeatherTemperatureResult {
  weatherData: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isStale: boolean;
  isCached: boolean;
  refetch: () => Promise<void>;
}

const CACHE_KEY = 'weather_temperature_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours - show warning if older

function getCachedWeather(): WeatherData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as WeatherData;
      return data;
    }
  } catch (e) {
    console.error('Error reading weather cache:', e);
  }
  return null;
}

function setCachedWeather(data: WeatherData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing weather cache:', e);
  }
}

export function useWeatherTemperature(
  location: string | null,
  unit: 'celsius' | 'fahrenheit' = 'celsius',
  enabled: boolean = true
): UseWeatherTemperatureResult {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const fetchWeather = useCallback(async (forceRefresh = false) => {
    if (!enabled || !location) {
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = getCachedWeather();
    const now = Date.now();
    
    if (cached && !forceRefresh) {
      const cacheAge = now - cached.timestamp;
      
      // Use cache if less than 1 hour old
      if (cacheAge < CACHE_DURATION_MS) {
        setWeatherData(cached);
        setLastUpdated(new Date(cached.timestamp));
        setIsStale(cacheAge > STALE_THRESHOLD_MS);
        setIsCached(true);
        setIsLoading(false);
        console.log('[Weather] Using cached data, age:', Math.round(cacheAge / 60000), 'minutes');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[Weather] Fetching from API for location:', location);
      
      // Build query params for GET request
      const params = new URLSearchParams({
        location: location,
        unit: unit,
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-weather?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch weather');
      }

      const weatherResponse: WeatherData = await response.json();
      
      setWeatherData(weatherResponse);
      setLastUpdated(new Date(weatherResponse.timestamp));
      setIsStale(false);
      setIsCached(false);
      setCachedWeather(weatherResponse);
      setError(null);
      
      console.log('[Weather] Fetched successfully:', weatherResponse);
    } catch (err) {
      console.error('[Weather] Error fetching:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather';
      setError(errorMessage);
      
      // Fall back to cache on error
      if (cached) {
        setWeatherData(cached);
        setLastUpdated(new Date(cached.timestamp));
        setIsStale(true);
        setIsCached(true);
        console.log('[Weather] Using stale cache due to error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [location, unit, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Set up hourly refresh
  useEffect(() => {
    if (!enabled || !location) return;

    const interval = setInterval(() => {
      console.log('[Weather] Hourly refresh triggered');
      fetchWeather(true);
    }, CACHE_DURATION_MS);

    return () => clearInterval(interval);
  }, [enabled, location, fetchWeather]);

  // Check staleness periodically
  useEffect(() => {
    if (!weatherData) return;

    const checkStale = () => {
      const age = Date.now() - weatherData.timestamp;
      setIsStale(age > STALE_THRESHOLD_MS);
    };

    const interval = setInterval(checkStale, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [weatherData]);

  const refetch = useCallback(async () => {
    await fetchWeather(true);
  }, [fetchWeather]);

  return {
    weatherData,
    isLoading,
    error,
    lastUpdated,
    isStale,
    isCached,
    refetch,
  };
}

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WeatherTemperatureCardProps {
  temperature: number | null;
  description: string;
  icon: string;
  location: string;
  unit: 'celsius' | 'fahrenheit';
  lastUpdated: Date | null;
  isLoading: boolean;
  isStale: boolean;
  isCached: boolean;
  error: string | null;
  onRefresh: () => void;
}

// Map OpenWeather icon codes to Lucide icons
function getWeatherIcon(iconCode: string) {
  const code = iconCode.slice(0, 2);
  switch (code) {
    case '01': // clear sky
      return Sun;
    case '02': // few clouds
    case '03': // scattered clouds
    case '04': // broken clouds
      return Cloud;
    case '09': // shower rain
    case '10': // rain
      return CloudRain;
    case '11': // thunderstorm
      return CloudLightning;
    case '13': // snow
      return CloudSnow;
    case '50': // mist
      return CloudFog;
    default:
      return Cloud;
  }
}

export function WeatherTemperatureCard({
  temperature,
  description,
  icon,
  location,
  unit,
  lastUpdated,
  isLoading,
  isStale,
  isCached,
  error,
  onRefresh,
}: WeatherTemperatureCardProps) {
  const WeatherIcon = getWeatherIcon(icon);
  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';

  if (isLoading && temperature === null) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && temperature === null) {
    return (
      <Card className="overflow-hidden border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Weather Unavailable</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all",
        isStale && "border-status-warning/50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Weather Icon */}
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <WeatherIcon className="h-8 w-8 text-white" />
            </div>

            {/* Temperature and Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">
                  {temperature !== null ? Math.round(temperature) : '--'}
                </span>
                <span className="text-lg text-muted-foreground">{unitSymbol}</span>
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
                )}
              </div>
              
              <p className="text-sm text-muted-foreground capitalize truncate">
                {description}
              </p>
              
              <p className="text-xs text-muted-foreground/70 truncate">
                📍 {location}
              </p>
            </div>

            {/* Refresh Button */}
            <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.3 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onRefresh}
                className="rounded-xl"
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </motion.div>
          </div>

          {/* Source Label */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                Ambient temperature from weather service
              </span>
              <span>
                {lastUpdated ? (
                  <>
                    {isStale || isCached ? 'Last known: ' : 'Updated '}
                    {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                  </>
                ) : (
                  'Fetching...'
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

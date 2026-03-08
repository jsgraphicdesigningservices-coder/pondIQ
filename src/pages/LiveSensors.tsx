import { useParams, useNavigate } from 'react-router-dom';
import { useFirebaseSensors } from '@/hooks/useFirebaseSensors';
import { usePondData } from '@/hooks/usePondData';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useWeatherTemperature } from '@/hooks/useWeatherTemperature';
import { useResolvedFirebasePondId } from '@/hooks/useResolvedFirebasePondId';
import { Header } from '@/components/Header';
import { SensorCard } from '@/components/SensorCard';
import { SensorDebugPanel } from '@/components/SensorDebugPanel';
import { WeatherTemperatureCard } from '@/components/WeatherTemperatureCard';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Clock,
  Loader2,
  Activity,
  Settings,
  AlertCircle,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

export default function LiveSensors() {
  const { pondId } = useParams<{ pondId: string }>();
  const navigate = useNavigate();
  const { ponds, isLoading: pondsLoading } = usePondData();
  const { settings } = useUserSettings();

  const pond = ponds.find(p => p.id === pondId) || (ponds.length === 1 ? ponds[0] : null);
  const activePondId = pondId || pond?.id || '';
  const { resolvedPondId } = useResolvedFirebasePondId(activePondId);

  // Direct Firebase sensor binding with debug info (pH and DO only)
  const { 
    sensorData, 
    isLoading: sensorLoading, 
    lastUpdated, 
    firebaseConnected,
    isStale,
    debugInfo,
    error: sensorError,
  } = useFirebaseSensors(resolvedPondId);

  // Weather-based temperature (from OpenWeather API)
  const {
    weatherData,
    isLoading: weatherLoading,
    error: weatherError,
    lastUpdated: weatherLastUpdated,
    isStale: weatherIsStale,
    isCached: weatherIsCached,
    refetch: refetchWeather,
  } = useWeatherTemperature(
    settings.weather_location || pond?.location || 'Manila, Philippines',
    settings.temp_unit,
    settings.weather_temp_enabled
  );

  // Sensor history for sparklines
  const { phHistory, doHistory } = useSensorHistory(resolvedPondId);

  // Individual sensor validity checks (pH and DO only from Firebase)
  const phValid = typeof sensorData?.ph === 'number' && !isNaN(sensorData.ph);
  const doValid = typeof sensorData?.dissolvedOxygen === 'number' && !isNaN(sensorData.dissolvedOxygen);
  const anySensorValid = phValid || doValid;
  
  // Debug log for troubleshooting
  if (import.meta.env.DEV) {
    console.log("Sensor data from Firebase (pH, DO):", sensorData, "| pH:", phValid, "| DO:", doValid);
    console.log("Weather data:", weatherData);
  }

  if (pondsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pond && !activePondId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Pond Not Found</h2>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const pondName = pond?.name || `Pond ${activePondId}`;

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Live Sensors" showBack />
      
      <main className="p-4 max-w-lg mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-status-safe to-emerald-600 flex items-center justify-center shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{pondName}</h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {lastUpdated ? (
                  <>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</>
                ) : (
                  <>Waiting for data...</>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate('/settings/thresholds')}
              className="rounded-xl"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.3 }}>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => window.location.reload()}
                className="rounded-xl"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Error State */}
        {sensorError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4"
          >
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Connection Error</p>
                  <p className="text-xs text-muted-foreground">{sensorError}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Debug Panel - Development Only */}
        <div className="mb-4">
          <SensorDebugPanel
            debugInfo={debugInfo}
            pondId={resolvedPondId}
            lastUpdated={lastUpdated}
            isStale={isStale}
            firebaseConnected={firebaseConnected}
          />
        </div>

        {/* Weather Temperature Card - Always show if enabled */}
        {settings.weather_temp_enabled && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0 }}
            className="mb-4"
          >
            <WeatherTemperatureCard
              temperature={weatherData?.temperature ?? null}
              description={weatherData?.description ?? 'Loading...'}
              icon={weatherData?.icon ?? '01d'}
              location={weatherData?.location ?? settings.weather_location ?? 'Unknown'}
              unit={settings.temp_unit}
              lastUpdated={weatherLastUpdated}
              isLoading={weatherLoading}
              isStale={weatherIsStale}
              isCached={weatherIsCached}
              error={weatherError}
              onRefresh={refetchWeather}
            />
          </motion.div>
        )}

        {/* ESP32 Sensors (pH and DO) */}
        {sensorLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : anySensorValid ? (
          <div className="space-y-4">
            {phValid && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <SensorCard 
                  type="ph" 
                  value={sensorData!.ph}
                  history={phHistory}
                  isLoading={false}
                  isStale={isStale}
                />
              </motion.div>
            )}
            
            {doValid && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <SensorCard 
                  type="do" 
                  value={sensorData!.dissolvedOxygen}
                  history={doHistory}
                  isLoading={false}
                  isStale={isStale}
                />
              </motion.div>
            )}
          </div>
        ) : (
          <Card className="border-muted bg-muted/30">
            <CardContent className="p-8 text-center">
              <WifiOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                ESP32 Sensors Not Connected
              </h3>
              <p className="text-sm text-muted-foreground">
                Waiting for pH and Dissolved Oxygen data from ESP32 device.
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Auto-refresh indicator */}
        <motion.div 
          className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${firebaseConnected ? 'bg-status-safe' : 'bg-destructive'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${firebaseConnected ? 'bg-status-safe' : 'bg-destructive'}`} />
          </span>
          {firebaseConnected ? 'Real-time updates active' : 'Reconnecting...'}
        </motion.div>
      </main>
    </div>
  );
}

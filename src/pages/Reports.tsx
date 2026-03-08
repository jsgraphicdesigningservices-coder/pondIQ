import { useParams, useNavigate } from 'react-router-dom';
import { usePondData } from '@/hooks/usePondData';
import { useSensorHistory, TimeRange } from '@/hooks/useSensorHistory';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, XAxis } from 'recharts';

const chartConfig = {
  ph: { label: 'pH Level', color: 'hsl(var(--status-safe))' },
  dissolvedOxygen: { label: 'Dissolved Oxygen', color: 'hsl(var(--primary))' },
  temperature: { label: 'Temperature', color: 'hsl(var(--status-warning))' },
};

export default function Reports() {
  const { pondId } = useParams<{ pondId: string }>();
  const navigate = useNavigate();
  const { ponds, isLoading: pondsLoading } = usePondData();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const pond = ponds.find(p => p.id === pondId) || (ponds.length === 1 ? ponds[0] : null);
  const stablePondId = pondId || pond?.id || 'pond1';

  const { history, isLoading: historyLoading, error, hasData, refetch } = useSensorHistory(stablePondId, timeRange);

  if (pondsLoading) {
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

  // Calculate trends from history
  const getTrend = (key: 'ph' | 'dissolvedOxygen' | 'temperature') => {
    if (history.length < 2) return 'stable';
    const first = history[0][key];
    const last = history[history.length - 1][key];
    const diff = last - first;
    if (diff > 0.3) return 'up';
    if (diff < -0.3) return 'down';
    return 'stable';
  };

  const renderTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-status-safe" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-status-critical" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // Get latest values from history
  const latestData = history.length > 0 ? history[history.length - 1] : null;

  const summaryStats = [
    { 
      label: 'pH Level', 
      value: latestData?.ph.toFixed(2) || '--', 
      trend: getTrend('ph'),
    },
    { 
      label: 'Dissolved O₂', 
      value: latestData ? `${latestData.dissolvedOxygen.toFixed(1)} mg/L` : '--', 
      trend: getTrend('dissolvedOxygen'),
    },
    { 
      label: 'Temperature', 
      value: latestData ? `${latestData.temperature.toFixed(1)}°C` : '--', 
      trend: getTrend('temperature'),
    },
  ];

  const renderChart = (dataKey: 'ph' | 'dissolvedOxygen' | 'temperature', gradientId: string, color: string, title: string) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[120px] w-full">
            <AreaChart data={history}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                axisLine={false} 
                tickLine={false}
                interval="preserveStartEnd"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                fill={`url(#${gradientId})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Reports" showBack />
      
      <main className="p-4 max-w-lg mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{pond.name}</h2>
              <p className="text-xs text-muted-foreground">
                Real-time sensor history
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={historyLoading}
          >
            <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
          </Button>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4"
          >
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error loading data</p>
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Current Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-3 gap-2 mb-6"
        >
          {summaryStats.map((stat) => (
            <div 
              key={stat.label}
              className="p-3 rounded-2xl bg-card border shadow-sm"
            >
              <p className="text-[10px] text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-sm font-bold text-foreground">{stat.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {renderTrendIcon(stat.trend)}
                <span className="text-[10px] text-muted-foreground capitalize">{stat.trend}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Time Range Tabs */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="1h" className="flex-1">1 Hour</TabsTrigger>
            <TabsTrigger value="24h" className="flex-1">24 Hours</TabsTrigger>
            <TabsTrigger value="7d" className="flex-1">7 Days</TabsTrigger>
          </TabsList>

          <TabsContent value={timeRange} className="mt-0 space-y-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  {renderChart('ph', 'phGradient', 'hsl(var(--status-safe))', 'pH Level')}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  {renderChart('dissolvedOxygen', 'doGradient', 'hsl(var(--primary))', 'Dissolved Oxygen (mg/L)')}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  {renderChart('temperature', 'tempGradient', 'hsl(var(--status-warning))', 'Temperature (°C)')}
                </motion.div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* No Data Message */}
        {!historyLoading && !hasData && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No sensor history available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Data will appear here as your sensors record readings
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  ChevronDown, 
  ChevronUp, 
  Wifi, 
  WifiOff, 
  Clock,
  Database,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SensorDebugInfo } from '@/hooks/useFirebaseSensors';
import { motion, AnimatePresence } from 'framer-motion';

interface SensorDebugPanelProps {
  debugInfo: SensorDebugInfo;
  pondId: string;
  lastUpdated: Date | null;
  isStale: boolean;
  firebaseConnected: boolean;
}

export function SensorDebugPanel({
  debugInfo,
  pondId,
  lastUpdated,
  isStale,
  firebaseConnected,
}: SensorDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const listenerStatusColors = {
    connecting: 'bg-status-warning text-status-warning-foreground',
    active: 'bg-status-safe text-white',
    error: 'bg-destructive text-destructive-foreground',
    disconnected: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30 bg-muted/20">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-xs font-mono text-muted-foreground">
              Debug: Firebase Sensors
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2"
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CardContent className="py-3 px-4 space-y-3">
              {/* Connection Status Row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {firebaseConnected ? (
                    <Wifi className="h-4 w-4 text-status-safe" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-xs font-medium">
                    {firebaseConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[10px] font-mono',
                    listenerStatusColors[debugInfo.listenerStatus]
                  )}
                >
                  {debugInfo.listenerStatus.toUpperCase()}
                </Badge>

                {isStale && (
                  <Badge variant="outline" className="text-[10px] bg-status-warning/20 text-status-warning border-status-warning/30">
                    STALE
                  </Badge>
                )}
              </div>

              {/* Firebase Path */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Firebase Path
                  </span>
                </div>
                <code className="block text-xs font-mono bg-background p-2 rounded border break-all">
                  {debugInfo.firebasePath || 'N/A'}
                </code>
              </div>

              {/* Pond ID */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Pond ID:</span>
                <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">
                  {pondId}
                </code>
              </div>

              {/* Timestamps */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Timestamps
                  </span>
                </div>
                <div className="text-xs font-mono space-y-0.5 pl-5">
                  <p>
                    <span className="text-muted-foreground">Last Data: </span>
                    {debugInfo.lastDataReceived?.toLocaleString() || 'Never'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Last Updated: </span>
                    {lastUpdated?.toLocaleString() || 'Never'}
                  </p>
                </div>
              </div>

              {/* Raw Data */}
              {debugInfo.rawData && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Raw Firebase Data
                  </span>
                  <pre className="text-[10px] font-mono bg-background p-2 rounded border overflow-auto max-h-32">
                    {JSON.stringify(debugInfo.rawData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Errors */}
              {debugInfo.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <span className="text-[10px] text-destructive uppercase tracking-wider">
                      Errors
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-destructive space-y-1 pl-5">
                    {debugInfo.errors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

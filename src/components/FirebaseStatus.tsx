import { useFirebaseConnection } from '@/hooks/useFirebaseConnection';
import { useFirebaseDevices } from '@/hooks/useFirebaseDevices';
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { clearFirebaseAnonymousAuthDisabledFlag, getFirebaseAuthError } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

export function FirebaseStatus() {
  const { isConnected, lastSyncTime, retryConnection } = useFirebaseConnection();
  const { pendingActionsCount } = useFirebaseDevices('pond1', true);
  const authError = getFirebaseAuthError();
  const authDisabled = authError === 'auth/admin-restricted-operation' || authError === 'auth/operation-not-allowed';

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${diffHour}h ago`;
  };

  const handleRecheckAuth = () => {
    clearFirebaseAnonymousAuthDisabledFlag();
    retryConnection();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
            <div className="relative">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-status-optimal" />
              ) : (
                <WifiOff className="h-4 w-4 text-status-critical" />
              )}
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
                  isConnected ? "bg-status-optimal animate-pulse" : "bg-status-critical"
                )}
              />
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {authDisabled ? 'Auth Disabled' : isConnected ? 'Live' : 'Offline'}
            </span>
            {pendingActionsCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-status-warning/20 text-status-warning"
              >
                <CloudOff className="h-3 w-3" />
                <span className="text-[10px] font-bold">{pendingActionsCount}</span>
              </motion.div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                "h-2 w-2 rounded-full",
                isConnected && !authDisabled ? "bg-status-optimal" : "bg-status-critical"
              )} />
              <span>
                {authDisabled
                  ? 'Anonymous Auth is disabled'
                  : isConnected
                  ? 'Connected to Firebase'
                  : 'Disconnected'}
              </span>
            </div>
            {authDisabled && (
              <div className="text-status-warning">
                Enable Firebase Console → Authentication → Sign-in method → Anonymous
              </div>
            )}
            <div className="text-muted-foreground">
              Last sync: {formatLastSync(lastSyncTime)}
            </div>
            {pendingActionsCount > 0 && (
              <div className="flex items-center gap-1.5 text-status-warning">
                <CloudOff className="h-3 w-3" />
                <span>{pendingActionsCount} pending action{pendingActionsCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {!isConnected && !authDisabled && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={retryConnection}
                className="w-full mt-2 h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry Connection
              </Button>
            )}
            {authDisabled && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRecheckAuth}
                className="w-full mt-2 h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Recheck Auth
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

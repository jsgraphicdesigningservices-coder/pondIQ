import { WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncPendingActions } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50',
        'px-4 py-3 rounded-xl shadow-lg backdrop-blur-lg',
        'flex items-center gap-3 transition-all duration-300',
        isOnline 
          ? 'bg-status-safe/90 text-white' 
          : 'bg-status-warning/90 text-white'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">You're offline</p>
            <p className="text-xs opacity-80">Changes will sync when connected</p>
          </div>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
              {pendingCount} pending
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-5 w-5 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Syncing data...</p>
            <p className="text-xs opacity-80">Please wait</p>
          </div>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{pendingCount} pending action{pendingCount > 1 ? 's' : ''}</p>
          </div>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={syncPendingActions}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            Sync Now
          </Button>
        </>
      ) : null}
    </div>
  );
}

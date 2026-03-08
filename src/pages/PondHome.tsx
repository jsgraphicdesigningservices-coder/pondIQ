import { useParams, useNavigate } from 'react-router-dom';
import { usePondData } from '@/hooks/usePondData';
import { useFirebasePondStatus } from '@/hooks/useFirebasePondStatus';
import { useResolvedFirebasePondId } from '@/hooks/useResolvedFirebasePondId';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { ActionButton } from '@/components/ActionButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  SlidersHorizontal,
  WifiOff,
  Loader2,
  Waves,
  User,
  ShieldCheck,
  Eye,
  Camera
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PondHome() {
  const { pondId } = useParams<{ pondId: string }>();
  const navigate = useNavigate();
  const { ponds, isLoading: pondsLoading } = usePondData();
  const { isAdmin } = useAuth();

  // Get the pond with ownership info
  const pond = ponds.find(p => p.id === pondId) || (ponds.length === 1 ? ponds[0] : null);
  const activePondId = pond?.id || pondId || '';
  const { resolvedPondId } = useResolvedFirebasePondId(activePondId);
  
  // Check if user is owner (for display purposes)
  const isOwner = (pond as any)?.isOwner ?? true;
  // Use Firebase pond status for realtime online/offline detection
  const { isOnline: firebaseIsOnline, lastSeen, connectionError } = useFirebasePondStatus(resolvedPondId);
  
  // const { alerts } = useAlerts();
  // const pondAlerts = alerts.filter(a => a.pondId === activePondId && !a.acknowledged);

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
          <p className="text-muted-foreground mb-4">The requested pond could not be found.</p>
        </div>
      </div>
    );
  }

  // Use Firebase status if available, fallback to pond.status
  const isOnline = connectionError ? pond.status !== 'offline' : firebaseIsOnline;

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header 
        title={pond.name}
        showBack={ponds.length > 1}
        alertCount={0}
      />
      
      <main className="p-4 max-w-lg mx-auto">
        {/* Admin Read-Only Notice */}
        {isAdmin && !isOwner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <Eye className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Admin View - You are viewing this pond as a monitor. Device controls are read-only.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Pond Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="mb-6 overflow-hidden border-none shadow-elevated">
            <CardContent className="p-0">
              <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white blur-2xl" />
                </div>

                <div className="relative flex items-center gap-4">
                  <motion.div 
                    className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Waves className="h-8 w-8 text-white" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-white">{pond.name}</h2>
                      {/* Ownership Badge */}
                      {isOwner ? (
                        <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 bg-white/20 text-white border-white/30">
                          <User className="h-2.5 w-2.5" />
                          Owner
                        </Badge>
                      ) : isAdmin ? (
                        <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 bg-white/20 text-white border-white/30">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          Admin
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-white/70 text-sm font-mono">{pond.ipAddress}</p>
                  </div>

                  <div className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                    isOnline 
                      ? 'bg-status-safe/20 text-white' 
                      : 'bg-white/10 text-white/70'
                  )}>
                    {isOnline ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-safe opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-safe" />
                        </span>
                        Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3.5 w-3.5" />
                        Offline
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Temporarily hidden until module rollout */}
          {/*
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <ActionButton
              icon={Activity}
              label="Live Sensors"
              description="Real-time data"
              variant="sensors"
              onClick={() => navigate(`/pond/${activePondId}/sensors`)}
            />
          </motion.div>
          */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="col-span-2"
          >
            <ActionButton
              icon={SlidersHorizontal}
              label="Devices"
              description="Control panel"
              variant="devices"
              onClick={() => navigate(`/pond/${activePondId}/devices`)}
            />
          </motion.div>

          {/* Temporarily hidden until module rollout */}
          {/*
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <ActionButton
              icon={BarChart3}
              label="Reports"
              description="Analytics & trends"
              variant="reports"
              onClick={() => navigate(`/pond/${activePondId}/reports`)}
            />
          </motion.div>
          */}

          {/* Temporarily hidden until module rollout */}
          {/*
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <ActionButton
              icon={Bell}
              label="Alerts"
              description={pondAlerts.length > 0 ? `${pondAlerts.length} active` : 'All clear'}
              variant="alerts"
              badge={pondAlerts.length}
              onClick={() => navigate(`/pond/${activePondId}/alerts`)}
            />
          </motion.div>
          */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="col-span-2"
          >
            <ActionButton
              icon={Camera}
              label="Cameras"
              description="Live pond video"
              variant="cameras"
              onClick={() => navigate(`/pond/${activePondId}/cameras`)}
            />
          </motion.div>
        </div>

        {/* Quick tip */}
        <motion.p 
          className="text-center text-xs text-muted-foreground mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          Tap any button to explore monitoring features
        </motion.p>
      </main>
    </div>
  );
}

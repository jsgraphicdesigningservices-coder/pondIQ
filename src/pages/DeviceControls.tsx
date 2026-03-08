import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ref, set } from "firebase/database";
import { usePondData } from "@/hooks/usePondData";
import { useCriticalAutoMode } from "@/hooks/useCriticalAutoMode";
import { useFirebasePondStatus } from "@/hooks/useFirebasePondStatus";
import { useScheduleExecutor } from "@/hooks/useScheduleExecutor";
import { useResolvedFirebasePondId } from "@/hooks/useResolvedFirebasePondId";
import { useAuth } from "@/contexts/AuthContext";
import { database } from "@/lib/firebase";
import { Header } from "@/components/Header";
import { DeviceCard } from "@/components/DeviceCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Loader2, PowerOff, Zap, Wifi, WifiOff, ShieldCheck, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { triggerHapticHeavy } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export default function DeviceControls() {
  const { pondId } = useParams<{ pondId: string }>();
  const navigate = useNavigate();
  const { ponds, isLoading: pondsLoading } = usePondData();
  const { isAdmin } = useAuth();
  const [isAllOff, setIsAllOff] = useState(false);
  const [isAllOn, setIsAllOn] = useState(false);

  const pond = ponds.find((p) => p.id === pondId) || (ponds.length === 1 ? ponds[0] : null);
  const stablePondId = pondId || pond?.id || "pond1";
  const { resolvedPondId } = useResolvedFirebasePondId(stablePondId);

  // Initialize critical auto mode monitoring
  useCriticalAutoMode(resolvedPondId);
  
  // Schedule executor - runs every 30s to execute ON/OFF at scheduled times
  useScheduleExecutor(resolvedPondId);
  
  // Get pond online status
  const { isOnline, lastSeen } = useFirebasePondStatus(resolvedPondId);

  const handleAllOff = async () => {
    // SECURITY: Admins cannot control devices
    if (isAdmin) {
      toast.error("Admin users have read-only access to devices");
      return;
    }
    triggerHapticHeavy();
    setIsAllOff(true);
    try {
      const devices = ["aerator"];
      await Promise.all(
        devices.map(async (device) => {
          await set(ref(database, `ponds/${resolvedPondId}/devices/${device}/mode`), "manual");
          await set(ref(database, `ponds/${resolvedPondId}/devices/${device}/state`), 0);
        })
      );
      toast.success("All devices turned off");
    } catch (error) {
      toast.error("Failed to turn off devices");
    } finally {
      setIsAllOff(false);
    }
  };

  const handleAllOn = async () => {
    // SECURITY: Admins cannot control devices
    if (isAdmin) {
      toast.error("Admin users have read-only access to devices");
      return;
    }
    triggerHapticHeavy();
    setIsAllOn(true);
    try {
      const devices = ["aerator"];
      await Promise.all(
        devices.map(async (device) => {
          await set(ref(database, `ponds/${resolvedPondId}/devices/${device}/mode`), "manual");
          await set(ref(database, `ponds/${resolvedPondId}/devices/${device}/state`), 1);
        })
      );
      toast.success("All devices turned on");
    } catch (error) {
      toast.error("Failed to turn on devices");
    } finally {
      setIsAllOn(false);
    }
  };

  const deviceCount = 1;

  if (pondsLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pond) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Pond Not Found</h2>
          <Button onClick={() => navigate("/")}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <Header title="Device Controls" showBack />

      <main className="p-4 max-w-md mx-auto">
        {/* Admin Read-Only Banner */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="mb-4 border-blue-500/30 bg-blue-500/10">
              <Eye className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <span>Admin View - Device controls are read-only</span>
                <Badge variant="secondary" className="ml-auto bg-blue-500/20 text-blue-600 border-blue-500/30">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Monitor Only
                </Badge>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Header with Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-5"
        >
          {/* Pond Info with Online Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{pond.name}</h2>
                <p className="text-xs text-muted-foreground">{deviceCount} devices connected</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Online/Offline Badge */}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                isOnline 
                  ? "bg-status-safe/20 text-status-safe" 
                  : "bg-destructive/20 text-destructive"
              )}>
                {isOnline ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                {isOnline ? "Online" : "Offline"}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/pond/${pond.id}/schedules`)}
                className="text-muted-foreground hover:text-foreground gap-1.5"
              >
                <Calendar className="h-4 w-4" />
                Schedules
              </Button>
            </div>
          </div>

          {/* Quick Action Buttons - Hidden for Admins */}
          {!isAdmin && (
            <div className="flex gap-3">
              {/* All On Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAllOn}
                disabled={isAllOn || isAllOff}
                className="flex-1 text-status-safe border-status-safe/30 hover:bg-status-safe/10 hover:text-status-safe gap-2"
              >
                {isAllOn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                All On
              </Button>

              {/* All Off Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAllOff}
                disabled={isAllOff || isAllOn}
                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-2"
              >
                {isAllOff ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
                All Off
              </Button>
            </div>
          )}
        </motion.div>

        {/* Device Cards */}
        <div className="space-y-4">
          {/*
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <DeviceCard pondId={resolvedPondId} type="motor" title="Water Pump" readOnly={isAdmin} />
          </motion.div>
          */}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <DeviceCard pondId={resolvedPondId} type="aerator" title="Power" readOnly={isAdmin} />
          </motion.div>

          {/*
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <DeviceCard pondId={resolvedPondId} type="light" title="Light" readOnly={isAdmin} />
          </motion.div>
          */}

        </div>

        {/* Subtle footer hint */}
        <motion.p
          className="text-center text-[11px] text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.25 }}
        >
          {isAdmin ? "Monitoring device states (read-only)" : "Use ON/OFF for Power controls"}
        </motion.p>

        {/* Last seen indicator */}
        {lastSeen && (
          <motion.p
            className="text-center text-[10px] text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Last seen: {lastSeen.toLocaleTimeString()}
          </motion.p>
        )}
      </main>
    </div>
  );
}

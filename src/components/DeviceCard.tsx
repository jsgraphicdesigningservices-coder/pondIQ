import { useEffect, useMemo, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Zap, Lightbulb, Power, Clock, Camera, ChevronRight, Video, Check, Send, AlertCircle, ShieldCheck } from "lucide-react";

import { database } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { triggerHapticMedium } from "@/lib/haptics";
import { useDeviceSchedule } from "@/hooks/useDeviceSchedule";
import { useDeviceCommand, CommandStatus, getCommandStatusDisplay } from "@/hooks/useDeviceCommand";

import { useAuth } from "@/contexts/AuthContext";

export type StaticDeviceType = "motor" | "aerator" | "light" | "camera";

interface DeviceCardProps {
  pondId: string;
  type: StaticDeviceType;
  title: string;
  className?: string;
  cameraUrl?: string | null;
  readOnly?: boolean; // For admin view - disable controls
}

type DeviceMode = "manual" | "auto";
type ControlSource = "MANUAL" | "AUTO";

interface DeviceMeta {
  icon: typeof Droplets;
  subtitle: string;
  hasSchedule: boolean;
}

function deviceMeta(type: StaticDeviceType): DeviceMeta {
  switch (type) {
    case "motor":
      return { icon: Droplets, subtitle: "Water circulation", hasSchedule: true };
    case "aerator":
      return { icon: Zap, subtitle: "Power supply", hasSchedule: true };
    case "light":
      return { icon: Lightbulb, subtitle: "Pond lighting", hasSchedule: true };
    case "camera":
      return { icon: Camera, subtitle: "Live monitoring", hasSchedule: false };
  }
}

export function DeviceCard({ pondId, type, title, className, cameraUrl, readOnly = false }: DeviceCardProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isOn, setIsOn] = useState(false);
  const [mode, setMode] = useState<DeviceMode>("manual");
  const { status: commandStatus, sendCommand } = useDeviceCommand();

  // SECURITY: Admins have read-only access to devices - they cannot control them
  const isControlDisabled = readOnly || isAdmin;

  const meta = useMemo(() => deviceMeta(type), [type]);
  const { icon: Icon, subtitle, hasSchedule } = meta;

  const { nextSchedule, isLoading: scheduleLoading } = useDeviceSchedule(pondId, type);

  const handleScheduleClick = () => {
    triggerHapticMedium();
    navigate(`/pond/${pondId}/schedules`);
  };

  const handleCameraClick = () => {
    triggerHapticMedium();
    navigate(`/pond/${pondId}/cameras`);
  };

  useEffect(() => {
    if (type === "camera" || !database) return;
    const deviceRef = ref(database, `ponds/${pondId}/devices/${type}`);
    const unsubscribe = onValue(
      deviceRef,
      (snap) => {
        const val = snap.val() as { state?: number; mode?: DeviceMode } | null;
        setIsOn((val?.state ?? 0) === 1);
        setMode(val?.mode ?? "manual");
      },
      () => {}
    );
    return () => unsubscribe();
  }, [pondId, type]);

  const handleSetState = async (targetState: boolean) => {
    // SECURITY: Block control for admins and auto mode
    if (isControlDisabled || mode === "auto") return;
    if (isOn === targetState) return;
    
    triggerHapticMedium();
    setIsOn(targetState); // Optimistic update
    
    await sendCommand(pondId, type, targetState ? 1 : 0, "manual");
  };

  const isAuto = mode === "auto";
  const isCamera = type === "camera";
  const controlSource: ControlSource = isAuto ? "AUTO" : "MANUAL";

  // Status badge colors
  const getStatusDotColor = () => {
    if (isCamera) return "bg-primary";
    if (isAuto) return "bg-blue-500";
    if (isOn) return "bg-status-safe";
    return "bg-destructive";
  };

  const getStatusText = () => {
    if (isCamera) return "VIEW";
    return isOn ? "ON" : "OFF";
  };

  const getScheduleDisplay = () => {
    if (isCamera) return "Tap to view feed";
    if (scheduleLoading) return "Loading...";
    if (nextSchedule) return nextSchedule.display;
    return "No schedule";
  };

  // Command status indicator
  const renderCommandStatus = () => {
    if (commandStatus === 'idle' || isCamera) return null;
    
    const { text, color } = getCommandStatusDisplay(commandStatus);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={cn("flex items-center gap-1.5 text-xs font-medium", color)}
      >
        {commandStatus === 'sending' && (
          <Send className="h-3 w-3 animate-pulse" />
        )}
        {commandStatus === 'sent' && (
          <Send className="h-3 w-3" />
        )}
        {commandStatus === 'acknowledged' && (
          <Check className="h-3 w-3" />
        )}
        {commandStatus === 'error' && (
          <AlertCircle className="h-3 w-3" />
        )}
        <span>{text}</span>
      </motion.div>
    );
  };

  return (
    <>
      <motion.div
        layout
        className={cn(
          "relative rounded-2xl border bg-card p-5 shadow-soft transition-all duration-300",
          className
        )}
        aria-label={`${title} control`}
      >
        {/* Content Layer */}
        <div className="relative">
          {/* Status Badge - Top Right */}
          <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
            {/* Control Source Badge */}
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
              isAuto 
                ? "bg-blue-500/20 text-blue-500 border border-blue-500/30" 
                : "bg-primary/20 text-primary border border-primary/30"
            )}>
              {controlSource}
            </div>
            
            {/* ON/OFF Badge */}
            <AnimatePresence mode="wait">
              <motion.div
                key={getStatusText()}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/30"
              >
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  getStatusDotColor(),
                  (isCamera || (isOn && !isAuto)) && "animate-pulse"
                )} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {getStatusText()}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Device Info Row */}
          <div className="flex items-center gap-4 mb-5">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 border",
              isCamera
                ? "border-primary/30 bg-primary/10"
                : isOn && !isAuto
                ? "border-status-safe/30 bg-status-safe/10"
                : isAuto
                ? "border-blue-500/20 bg-blue-500/10"
                : "border-border bg-muted/30"
            )}>
              <Icon
                className={cn(
                  "h-6 w-6 transition-colors duration-300",
                  isCamera
                    ? "text-primary"
                    : isOn && !isAuto
                    ? "text-status-safe"
                    : isAuto
                    ? "text-blue-500"
                    : "text-foreground"
                )}
                strokeWidth={2}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground leading-tight">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {/* Schedule Preview - Tappable */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={hasSchedule ? handleScheduleClick : isCamera ? handleCameraClick : undefined}
            className={cn(
              "flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 w-full transition-colors",
              (hasSchedule || isCamera) && "hover:bg-muted/50 hover:border-primary/30 cursor-pointer"
            )}
          >
            {isCamera ? (
              <Video className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">{isCamera ? "Status:" : "Next:"}</span>
            <span className="text-xs font-medium text-foreground flex-1 text-left">{getScheduleDisplay()}</span>
            {(hasSchedule || isCamera) && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </motion.button>

          {/* Control Buttons */}
          {isCamera ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCameraClick}
              className="h-16 w-full rounded-xl flex items-center justify-center gap-3 transition-all duration-300 text-white font-bold text-base shadow-md bg-primary hover:bg-primary/90"
              aria-label="View camera feed"
            >
              <Video className="h-5 w-5" strokeWidth={2.5} />
              <span className="uppercase tracking-wide">View Feed</span>
            </motion.button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: (isControlDisabled || isAuto || commandStatus === 'sending' || isOn) ? 1 : 1.01 }}
                whileTap={{ scale: (isControlDisabled || isAuto || commandStatus === 'sending' || isOn) ? 1 : 0.98 }}
                onClick={() => handleSetState(true)}
                disabled={commandStatus === 'sending' || isControlDisabled || isAuto || isOn}
                className={cn(
                  "h-16 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-bold text-base shadow-md border",
                  isOn
                    ? "bg-status-safe text-white border-status-safe"
                    : "bg-status-safe/10 text-status-safe border-status-safe/40 hover:bg-status-safe/20",
                  (isControlDisabled || isAuto) && "opacity-60 cursor-not-allowed"
                )}
                aria-label={isControlDisabled ? `${title} ON (read-only)` : isAuto ? `${title} ON (auto mode)` : `Turn ON ${title}`}
              >
                {isControlDisabled && !isAuto ? (
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
                ) : (
                  <Power className="h-5 w-5" strokeWidth={2.5} />
                )}
                <span className="uppercase tracking-wide">ON</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: (isControlDisabled || isAuto || commandStatus === 'sending' || !isOn) ? 1 : 1.01 }}
                whileTap={{ scale: (isControlDisabled || isAuto || commandStatus === 'sending' || !isOn) ? 1 : 0.98 }}
                onClick={() => handleSetState(false)}
                disabled={commandStatus === 'sending' || isControlDisabled || isAuto || !isOn}
                className={cn(
                  "h-16 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-bold text-base shadow-md border",
                  !isOn
                    ? "bg-destructive text-white border-destructive"
                    : "bg-destructive/10 text-destructive border-destructive/40 hover:bg-destructive/20",
                  (isControlDisabled || isAuto) && "opacity-60 cursor-not-allowed"
                )}
                aria-label={isControlDisabled ? `${title} OFF (read-only)` : isAuto ? `${title} OFF (auto mode)` : `Turn OFF ${title}`}
              >
                {isControlDisabled && !isAuto ? (
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
                ) : (
                  <Power className="h-5 w-5" strokeWidth={2.5} />
                )}
                <span className="uppercase tracking-wide">OFF</span>
              </motion.button>
            </div>
          )}

          {/* Command Status Display */}
          <AnimatePresence>
            {commandStatus !== 'idle' && !isCamera && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex justify-center"
              >
                {renderCommandStatus()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sending indicator overlay */}
        <AnimatePresence>
          {commandStatus === 'sending' && !isCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/30 rounded-2xl flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

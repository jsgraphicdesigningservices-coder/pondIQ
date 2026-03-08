import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Maximize2, Minimize2, Volume2, VolumeX, Settings, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CameraViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pondId: string;
  cameraName: string;
  streamUrl?: string | null;
}

export function CameraViewerDialog({
  open,
  onOpenChange,
  pondId,
  cameraName,
  streamUrl,
}: CameraViewerDialogProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden border-0 bg-black/95",
        isFullscreen ? "max-w-[95vw] h-[90vh]" : "max-w-2xl"
      )}>
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-sm font-medium">
                  {cameraName}
                </DialogTitle>
                <p className="text-white/60 text-xs">Live Feed</p>
              </div>
            </div>
            
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Live</span>
            </div>
          </div>
        </DialogHeader>

        {/* Video Container */}
        <div className={cn(
          "relative bg-black flex items-center justify-center",
          isFullscreen ? "h-full" : "aspect-video"
        )}>
          {/* Placeholder stream - replace with actual stream URL */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-24 w-24 rounded-full border-2 border-white/20 flex items-center justify-center mb-4"
            >
              <Camera className="h-12 w-12" />
            </motion.div>
            <p className="text-sm font-medium">Camera Feed Placeholder</p>
            <p className="text-xs mt-1">Connect your ESP32-CAM or IP camera</p>
            <p className="text-xs text-white/30 mt-3 font-mono">
              rtsp://{pondId}.local:554/stream
            </p>
          </div>

          {/* Simulated static/noise effect */}
          <div 
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Connection info */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-white/40">
            <span>Resolution: 1280x720</span>
            <span>•</span>
            <span>Latency: ~200ms</span>
            <span>•</span>
            <span>Bitrate: 2.5 Mbps</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

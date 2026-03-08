import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, CirclePlus, EthernetPort, Globe, HardDrive, RefreshCw, Router, Wifi, WifiOff } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cameraService } from "@/services/cameraService";
import { PondCamera } from "@/types/camera";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function CameraTile({ camera, onOpen }: { camera: PondCamera; onOpen: () => void }) {
  const isOnline = camera.status === "online";

  return (
    <button
      onClick={onOpen}
      className="text-left rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-colors"
    >
      <div className="relative h-28 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        {camera.thumbnailUrl ? (
          <img src={camera.thumbnailUrl} className="h-full w-full object-cover" alt={`${camera.name} preview`} />
        ) : (
          <Camera className="h-10 w-10 text-white/30" />
        )}
        <span
          className={cn(
            "absolute right-2 top-2 h-2.5 w-2.5 rounded-full",
            isOnline ? "bg-status-safe" : "bg-status-critical"
          )}
        />
      </div>
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm text-foreground truncate">{camera.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{camera.deviceId || camera.streamUrl || "No endpoint"}</p>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={isOnline ? "text-status-safe border-status-safe/40" : "text-status-critical border-status-critical/40"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
          <span className="text-[11px] text-muted-foreground uppercase">{camera.connectionType}</span>
        </div>
      </div>
    </button>
  );
}

export default function CameraDashboard() {
  const navigate = useNavigate();
  const { pondId = "" } = useParams<{ pondId: string }>();
  const [cameras, setCameras] = useState<PondCamera[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onlineCount = useMemo(() => cameras.filter((camera) => camera.status === "online").length, [cameras]);
  const offlineCameras = useMemo(() => cameras.filter((camera) => camera.status !== "online"), [cameras]);

  const loadCameras = () => {
    setCameras(cameraService.listByPond(pondId));
  };

  useEffect(() => {
    loadCameras();
  }, [pondId]);

  const refreshAllStatuses = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(cameras.map((camera) => cameraService.refreshStatus(camera.id)));
      loadCameras();
      toast.success("Camera status refreshed");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-7">
      <Header
        title="Camera Dashboard"
        showBack
      />

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Pond cameras</p>
              <p className="font-semibold text-lg">{cameras.length} total</p>
              <p className="text-xs text-slate-400">{onlineCount} online</p>
            </div>
            <Button
              onClick={refreshAllStatuses}
              disabled={isRefreshing || cameras.length === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </CardContent>
        </Card>

        {offlineCameras.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/10 text-amber-100">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold">Offline diagnostics</p>
              <p className="text-xs">{offlineCameras.length} camera(s) need setup. Most common fix: add camera IP or stream URL.</p>
              <p className="text-xs">For V380 cameras: complete setup in V380 app first, then use local IP + RTSP/HLS stream in this app.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={() => navigate(`/pond/${pondId}/cameras/add`)}
            className="h-11 bg-blue-600 hover:bg-blue-500 text-white"
          >
            <CirclePlus className="h-4 w-4 mr-2" />
            Add Camera
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/pond/${pondId}/cameras/setup`)}
            className="h-11 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <Router className="h-4 w-4 mr-2" />
            Network Setup
          </Button>
        </div>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Connection Methods</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-800 p-3 text-sm flex items-center gap-2"><Wifi className="h-4 w-4 text-blue-400" /> WiFi Camera</div>
              <div className="rounded-xl bg-slate-800 p-3 text-sm flex items-center gap-2"><EthernetPort className="h-4 w-4 text-blue-400" /> Wired Camera</div>
              <div className="rounded-xl bg-slate-800 p-3 text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-blue-400" /> Local Network Camera</div>
              <div className="rounded-xl bg-slate-800 p-3 text-sm flex items-center gap-2"><HardDrive className="h-4 w-4 text-blue-400" /> RTSP / ONVIF</div>
            </div>
          </CardContent>
        </Card>

        {cameras.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900 text-slate-100">
            <CardContent className="py-10 text-center space-y-2">
              <WifiOff className="h-8 w-8 mx-auto text-slate-500" />
              <p className="font-medium">No cameras added yet</p>
              <p className="text-xs text-slate-400">Add your V380, RTSP, or ESP32-CAM device to start live pond monitoring.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cameras.map((camera) => (
              <CameraTile
                key={camera.id}
                camera={camera}
                onOpen={() => navigate(`/pond/${pondId}/cameras/live/${camera.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

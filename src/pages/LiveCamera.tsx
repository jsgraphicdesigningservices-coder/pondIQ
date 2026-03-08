import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, CircleDot, Expand, Minimize, Move, RefreshCw, ScanLine, Stethoscope, ZoomIn, ZoomOut } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RTSPPlayer } from "@/components/camera/RTSPPlayer";
import { cameraService } from "@/services/cameraService";
import { PondCamera } from "@/types/camera";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LiveCamera() {
  const navigate = useNavigate();
  const { pondId = "", cameraId = "" } = useParams<{ pondId: string; cameraId: string }>();
  const playerWrapRef = useRef<HTMLDivElement | null>(null);

  const [camera, setCamera] = useState<PondCamera | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const triedFallbacksRef = useRef<Set<string>>(new Set());

  const POND_MAIN_HLS = "http://localhost:1984/api/stream.m3u8?src=pond_main&mp4";
  const POND_SUB_HLS = "http://localhost:1984/api/stream.m3u8?src=pond_sub&mp4";


  const loadCamera = () => {
    const next = cameraService.getById(cameraId);
    if (!next || next.pondId !== pondId) {
      toast.error("Camera not found");
      navigate(`/pond/${pondId}/cameras`);
      return;
    }
    setCamera(next);
  };

  useEffect(() => {
    loadCamera();
  }, [cameraId, pondId]);

  useEffect(() => {
    const ensureRelayStreams = async () => {
      if (!camera?.ipAddress || !camera.password) return;

      const user = camera.username || "admin";
      const pass = encodeURIComponent(camera.password);
      const host = camera.ipAddress;
      const port = camera.port || 554;

      const rtspMain = `rtsp://${user}:${pass}@${host}:${port}/live/ch00_1`;
      const rtspSub = `rtsp://${user}:${pass}@${host}:${port}/live/ch00_0`;

      try {
        await cameraService.registerGo2RtcStream(rtspMain, "pond_main");
      } catch {
        // Continue; fallback candidates may still work.
      }

      try {
        await cameraService.registerGo2RtcStream(rtspSub, "pond_sub");
      } catch {
        // Continue; fallback candidates may still work.
      }

      if (!camera.streamUrl || camera.streamUrl.startsWith("rtsp://") || camera.streamUrl.includes("src=pond_main") || camera.streamUrl.includes("src=pond_sub")) {
        cameraService.updateCamera(camera.id, { streamUrl: POND_MAIN_HLS });
        setCamera((prev) => (prev ? { ...prev, streamUrl: POND_MAIN_HLS } : prev));
      }
    };

    ensureRelayStreams();
  }, [camera?.id, camera?.ipAddress, camera?.password, camera?.username, camera?.port]);

  const statusText = useMemo(() => {
    if (!camera) return "Unknown";
    if (camera.status === "online") return "Online";
    if (camera.lastError === "not_configured") return "Missing stream URL/IP";
    if (camera.lastError === "wrong_password") return "Wrong password";
    if (camera.lastError === "network_timeout") return "Network timeout";
    if (camera.lastError === "offline") return "Offline";
    return camera.status;
  }, [camera]);

  const relayUrlHint = useMemo(() => {
    if (!camera?.streamUrl?.startsWith("rtsp://")) return null;
    return cameraService.buildGo2RtcHlsUrl(camera.streamUrl);
  }, [camera?.streamUrl]);

  const fallbackCandidates = useMemo(() => {
    if (!camera) return [] as string[];

    const candidates: string[] = [POND_SUB_HLS, POND_MAIN_HLS];
    const user = camera.username || "admin";
    const pass = encodeURIComponent(camera.password || "");
    const host = camera.ipAddress || "";
    const port = camera.port || 554;

    if (camera.streamUrl?.includes("src=pond_main")) {
      candidates.push("http://localhost:1984/api/stream.m3u8?src=pond_sub&mp4");
    }

    if (host) {
      candidates.push(cameraService.buildGo2RtcHlsUrl(`rtsp://${user}:${pass}@${host}:${port}/live/ch00_1`));
      candidates.push(cameraService.buildGo2RtcHlsUrl(`rtsp://${user}:${pass}@${host}:${port}/live/ch00_0`));
      candidates.push(cameraService.buildGo2RtcHlsUrl(`rtsp://${user}:${pass}@${host}:${port}/live`));
      candidates.push(cameraService.buildGo2RtcHlsUrl(`rtsp://${user}:${pass}@${host}:${port}/h264/ch1/main/av_stream`));
    }

    return candidates.filter((value, index, arr) => Boolean(value) && arr.indexOf(value) === index);
  }, [camera]);

  const applyNextFallback = () => {
    if (!camera) return false;

    for (const candidate of fallbackCandidates) {
      if (candidate === camera.streamUrl) continue;
      if (triedFallbacksRef.current.has(candidate)) continue;

      triedFallbacksRef.current.add(candidate);
      cameraService.updateCamera(camera.id, { streamUrl: candidate });
      setCamera((prev) => (prev ? { ...prev, streamUrl: candidate } : prev));
      toast.info("Trying fallback stream automatically...");
      return true;
    }

    return false;
  };

  const sendPtz = async (command: "up" | "down" | "left" | "right" | "zoom_in" | "zoom_out") => {
    if (!camera) return;
    const result = await cameraService.sendPtzCommand(camera.id, command);
    if (!result.ok) {
      toast.error("PTZ command failed");
    }
  };

  const refreshStatus = async () => {
    if (!camera) return;
    const result = await cameraService.refreshStatus(camera.id);
    loadCamera();
    if (!result.ok && result.error) {
      toast.error(result.error);
    }
  };

  const useLocalRelayUrl = async () => {
    if (!camera) {
      toast.error("Camera not found");
      return;
    }

    cameraService.updateCamera(camera.id, { streamUrl: POND_MAIN_HLS });
    setCamera((prev) => (prev ? { ...prev, streamUrl: POND_MAIN_HLS } : prev));
    toast.success("Switched to stable relay URL (pond_main)");
  };

  const handleScreenshot = async () => {
    const node = playerWrapRef.current?.querySelector("video") as HTMLVideoElement | null;
    if (!node) {
      toast.error("No active video frame for screenshot");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = node.videoWidth || 1280;
    canvas.height = node.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Screenshot failed");
      return;
    }

    ctx.drawImage(node, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${camera?.name || "camera"}-${Date.now()}.png`;
    link.click();
    toast.success("Screenshot captured");
  };

  const handleRecord = async () => {
    const node = playerWrapRef.current?.querySelector("video") as HTMLVideoElement | null;
    if (!node) {
      toast.error("No active video stream for recording");
      return;
    }

    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      return;
    }

    const streamSource = node as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      webkitCaptureStream?: () => MediaStream;
    };

    const capture = streamSource.captureStream || streamSource.webkitCaptureStream;

    if (!capture) {
      toast.error("Recording is not supported on this device");
      return;
    }

    const stream = capture.call(streamSource);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${camera?.name || "camera"}-${Date.now()}.webm`;
      link.click();
      toast.success("Recording saved");
    };

    setMediaRecorder(recorder);
    recorder.start(400);
    setIsRecording(true);
    toast.success("Recording started");
  };

  const toggleFullscreen = async () => {
    if (!playerWrapRef.current) return;

    if (!document.fullscreenElement) {
      await playerWrapRef.current.requestFullscreen();
      setIsFullscreen(true);
      return;
    }

    await document.exitFullscreen();
    setIsFullscreen(false);
  };

  if (!camera) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-6">
      <Header title={camera.name} showBack />

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        <div
          ref={playerWrapRef}
          className={cn(
            "rounded-2xl overflow-hidden border border-slate-800 bg-black",
            isFullscreen ? "h-screen" : "aspect-video"
          )}
        >
          <RTSPPlayer
            streamUrl={camera.streamUrl}
            muted={isMuted}
            zoom={zoom}
            onError={(message) => {
              const lower = message.toLowerCase();
              const isManifestIssue = lower.includes("manifest") || lower.includes("hls error") || lower.includes("stream playback failed");

              if (isManifestIssue && applyNextFallback()) {
                return;
              }

              toast.error(message);
            }}
          />
        </div>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className={cn("h-2.5 w-2.5 rounded-full", camera.status === "online" ? "bg-status-safe" : "bg-status-critical")} />
                <span>{statusText}</span>
              </div>
              <Button variant="outline" size="sm" onClick={refreshStatus} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>

            {relayUrlHint && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 space-y-2">
                <p className="text-xs text-amber-100">Raw RTSP needs relay for browser playback.</p>
                <p className="text-[11px] text-amber-200 break-all">{relayUrlHint}</p>
                <Button size="sm" onClick={useLocalRelayUrl} className="bg-amber-500 text-black hover:bg-amber-400">
                  Convert To Relay HLS
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button className="bg-blue-600 hover:bg-blue-500" onClick={handleScreenshot}><ScanLine className="h-4 w-4 mr-2" />Screenshot</Button>
              <Button className={cn("bg-blue-600 hover:bg-blue-500", isRecording && "bg-status-critical hover:bg-status-critical/90")} onClick={handleRecord}>
                <CircleDot className="h-4 w-4 mr-2" />
                {isRecording ? "Stop Rec" : "Record"}
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-500" onClick={() => setIsMuted((prev) => !prev)}>
                <Camera className="h-4 w-4 mr-2" />
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-500" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-4 w-4 mr-2" /> : <Expand className="h-4 w-4 mr-2" />}
                Fullscreen
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-100 hover:bg-slate-800"
              onClick={() => navigate(`/pond/${pondId}/cameras/diagnostics/${camera.id}`)}
            >
              <Stethoscope className="h-4 w-4 mr-2" />
              Run Camera Diagnostics
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2"><Move className="h-4 w-4" />PTZ Controls</p>
                <div className="grid grid-cols-3 gap-2 max-w-[220px]">
                  <div />
                  <Button variant="outline" onClick={() => sendPtz("up")} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"><ArrowUp className="h-4 w-4" /></Button>
                  <div />
                  <Button variant="outline" onClick={() => sendPtz("left")} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" onClick={() => refreshStatus()} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"><RefreshCw className="h-4 w-4" /></Button>
                  <Button variant="outline" onClick={() => sendPtz("right")} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"><ArrowRight className="h-4 w-4" /></Button>
                  <div />
                  <Button variant="outline" onClick={() => sendPtz("down")} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"><ArrowDown className="h-4 w-4" /></Button>
                  <div />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Zoom</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => { setZoom((value) => Math.max(1, Number((value - 0.1).toFixed(2)))); sendPtz("zoom_out"); }} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm">{zoom.toFixed(1)}x</div>
                  <Button variant="outline" onClick={() => { setZoom((value) => Math.min(3, Number((value + 0.1).toFixed(2)))); sendPtz("zoom_in"); }} className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400">Zoom range: 1.0x to 3.0x</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

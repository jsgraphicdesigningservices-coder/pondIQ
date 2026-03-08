import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { cameraService } from "@/services/cameraService";

interface RTSPPlayerProps {
  streamUrl?: string;
  poster?: string;
  muted?: boolean;
  zoom?: number;
  className?: string;
  onCanPlay?: () => void;
  onError?: (message: string) => void;
}

function buildProxyHint(rtspUrl: string) {
  return cameraService.buildGo2RtcHlsUrl(rtspUrl);
}

export function RTSPPlayer({
  streamUrl,
  poster,
  muted = true,
  zoom = 1,
  className,
  onCanPlay,
  onError,
}: RTSPPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayable, setIsPlayable] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const isRtsp = useMemo(() => Boolean(streamUrl && streamUrl.startsWith("rtsp://")), [streamUrl]);
  const normalizedSource = useMemo(() => {
    if (!streamUrl) return "";
    if (streamUrl.startsWith("rtsp://")) {
      return cameraService.buildGo2RtcHlsUrl(streamUrl);
    }
    return streamUrl;
  }, [streamUrl]);

  const isHls = useMemo(() => Boolean(normalizedSource && normalizedSource.includes(".m3u8")), [normalizedSource]);

  const go2rtcViewerUrl = useMemo(() => {
    if (!streamUrl) return "";

    if (streamUrl.startsWith("rtsp://")) {
      return `http://localhost:1984/stream.html?src=${encodeURIComponent(streamUrl)}&mode=mse,hls,mjpeg,webrtc`;
    }

    try {
      const parsed = new URL(streamUrl);
      if (parsed.pathname.includes("/api/stream.m3u8")) {
        const srcParam = parsed.searchParams.get("src");
        if (srcParam) {
          return `http://localhost:1984/stream.html?src=${encodeURIComponent(srcParam)}&mode=mse,hls,mjpeg,webrtc`;
        }
      }
    } catch {
      return "";
    }

    return "";
  }, [streamUrl]);

  useEffect(() => {
    if (!videoRef.current || !normalizedSource || !isHls) {
      return;
    }

    let disposed = false;
    let hlsInstance: any = null;
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;

    const setupHls = async () => {
      try {
        const mod = await import("hls.js");
        const Hls = mod.default;

        if (disposed || !videoRef.current) {
          return;
        }

        if (Hls.isSupported()) {
          hlsInstance = new Hls({
            lowLatencyMode: true,
          });

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, async () => {
            if (!videoRef.current) return;
            try {
              await videoRef.current.play();
            } catch {
              // Ignore autoplay rejections; user gesture controls are still available.
            }
            setIsPlayable(true);
            setIsLoading(false);
            onCanPlay?.();
          });

          hlsInstance.on(Hls.Events.ERROR, (_event: unknown, data: { fatal?: boolean; details?: string }) => {
            if (data?.fatal) {
              setIsLoading(false);
              setIsPlayable(false);
              if (go2rtcViewerUrl) {
                setUseIframeFallback(true);
              }
              onError?.(`HLS error: ${data.details || "fatal playback error"}`);
            }
          });

          hlsInstance.loadSource(normalizedSource);
          hlsInstance.attachMedia(videoRef.current);

          // If playback doesn't start quickly, fall back to go2rtc's own viewer.
          loadingTimer = setTimeout(() => {
            if (!disposed && !isPlayable && go2rtcViewerUrl) {
              setUseIframeFallback(true);
              setIsLoading(false);
            }
          }, 9000);

          return;
        }

        // Safari/iOS native HLS path.
        videoRef.current.src = normalizedSource;
      } catch {
        onError?.("Failed to initialize HLS playback");
      }
    };

    setupHls();

    return () => {
      disposed = true;
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
      hlsInstance?.destroy();
    };
  }, [go2rtcViewerUrl, isHls, isPlayable, normalizedSource, onCanPlay, onError]);

  useEffect(() => {
    setIsLoading(true);
    setIsPlayable(false);
    setUseIframeFallback(false);
  }, [streamUrl]);

  if (!streamUrl) {
    return (
      <div className={cn("h-full w-full flex items-center justify-center bg-black/70 text-white/70", className)}>
        <div className="text-center space-y-2 px-4">
          <WifiOff className="h-8 w-8 mx-auto" />
          <p className="text-sm font-medium">No stream URL configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      {useIframeFallback && go2rtcViewerUrl && (
        <iframe
          src={go2rtcViewerUrl}
          title="go2rtc fallback viewer"
          className="absolute inset-0 z-30 h-full w-full border-0"
          allow="autoplay; fullscreen"
        />
      )}

      {isRtsp && (
        <div className="absolute left-2 right-2 top-2 z-20 rounded-lg bg-black/60 border border-white/10 p-2 text-[11px] text-white/80">
          RTSP relay mode enabled: {buildProxyHint(streamUrl)}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 text-white/70">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs">Connecting to camera...</p>
        </div>
      )}

      {!isPlayable && !isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-white/70">
          <div className="text-center space-y-2">
            <Camera className="h-8 w-8 mx-auto" />
            <p className="text-xs">Unable to render this stream format</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="h-full w-full object-cover transition-transform duration-200"
        style={{ transform: `scale(${zoom})` }}
        src={isHls ? undefined : normalizedSource}
        poster={poster}
        muted={muted}
        playsInline
        autoPlay
        controls={false}
        onCanPlay={() => {
          setIsPlayable(true);
          setIsLoading(false);
          onCanPlay?.();
        }}
        onError={() => {
          setIsLoading(false);
          setIsPlayable(false);
          onError?.("Stream playback failed");
        }}
      />
    </div>
  );
}

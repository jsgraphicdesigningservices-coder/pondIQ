import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Copy, Loader2, Network, RefreshCw, Router, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cameraService } from "@/services/cameraService";
import { PondCamera } from "@/types/camera";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CheckState = "idle" | "running" | "pass" | "fail";

interface CheckItem {
  key: string;
  label: string;
  detail: string;
  state: CheckState;
}

function parseHostFromUrl(streamUrl?: string) {
  if (!streamUrl) return null;
  try {
    if (streamUrl.startsWith("rtsp://")) {
      const fixed = streamUrl.replace("rtsp://", "http://");
      const u = new URL(fixed);
      return u.hostname;
    }
    const u = new URL(streamUrl);
    return u.hostname;
  } catch {
    return null;
  }
}

export default function CameraDiagnostics() {
  const navigate = useNavigate();
  const { pondId = "", cameraId = "" } = useParams<{ pondId: string; cameraId: string }>();
  const [camera, setCamera] = useState<PondCamera | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [checks, setChecks] = useState<CheckItem[]>([]);

  useEffect(() => {
    const c = cameraService.getById(cameraId);
    if (!c || c.pondId !== pondId) {
      toast.error("Camera not found");
      navigate(`/pond/${pondId}/cameras`);
      return;
    }
    setCamera(c);
  }, [cameraId, pondId]);

  const cameraHost = useMemo(() => parseHostFromUrl(camera?.streamUrl) || camera?.ipAddress || null, [camera?.streamUrl, camera?.ipAddress]);

  const powershellRtspTest = useMemo(() => {
    if (!cameraHost) return "";
    return `Test-NetConnection ${cameraHost} -Port 554`;
  }, [cameraHost]);

  const runChecks = async () => {
    if (!camera) return;

    const initial: CheckItem[] = [
      { key: "relay", label: "Local relay reachable", detail: "http://localhost:1984", state: "running" },
      { key: "camera-http-80", label: "Camera HTTP reachable", detail: cameraHost ? `http://${cameraHost}:80` : "No host", state: "idle" },
      { key: "camera-http-8080", label: "Camera HTTP alt port", detail: cameraHost ? `http://${cameraHost}:8080` : "No host", state: "idle" },
      { key: "stream-shape", label: "Stream URL looks valid", detail: camera.streamUrl || "No stream URL", state: "idle" },
      { key: "rtsp-command", label: "RTSP port test command", detail: powershellRtspTest || "No host", state: "idle" },
    ];

    setChecks(initial);
    setIsRunning(true);

    const update = (key: string, state: CheckState, detail?: string) => {
      setChecks((prev) => prev.map((item) => (item.key === key ? { ...item, state, detail: detail ?? item.detail } : item)));
    };

    try {
      try {
        await fetch("http://localhost:1984/api", { mode: "no-cors" });
        update("relay", "pass", "go2rtc is reachable on localhost:1984");
      } catch {
        update("relay", "fail", "Relay not reachable. Start go2rtc on this machine.");
      }

      if (cameraHost) {
        update("camera-http-80", "running");
        try {
          await fetch(`http://${cameraHost}:80`, { mode: "no-cors" });
          update("camera-http-80", "pass", `HTTP reachable on ${cameraHost}:80`);
        } catch {
          update("camera-http-80", "fail", `No HTTP response on ${cameraHost}:80`);
        }

        update("camera-http-8080", "running");
        try {
          await fetch(`http://${cameraHost}:8080`, { mode: "no-cors" });
          update("camera-http-8080", "pass", `HTTP reachable on ${cameraHost}:8080`);
        } catch {
          update("camera-http-8080", "fail", `No HTTP response on ${cameraHost}:8080`);
        }
      } else {
        update("camera-http-80", "fail", "Camera host not found in stream URL/IP field");
        update("camera-http-8080", "fail", "Camera host not found in stream URL/IP field");
      }

      const urlLooksValid = Boolean(camera.streamUrl && (camera.streamUrl.startsWith("rtsp://") || camera.streamUrl.startsWith("http://") || camera.streamUrl.startsWith("https://")));
      update("stream-shape", urlLooksValid ? "pass" : "fail", urlLooksValid ? "Stream URL format is valid" : "Set stream URL starting with rtsp:// or http://");
      update("rtsp-command", "pass", powershellRtspTest || "Set camera IP/stream URL first");
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (camera) {
      runChecks();
    }
  }, [camera?.id]);

  if (!camera) return null;

  const hasFailure = checks.some((item) => item.state === "fail");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-8">
      <Header title="Camera Diagnostics" showBack />

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              {camera.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>IP: <span className="text-slate-300">{camera.ipAddress || "Not set"}</span></p>
            <p>Stream: <span className="text-slate-300 break-all">{camera.streamUrl || "Not set"}</span></p>
          </CardContent>
        </Card>

        <Card className={cn("border", hasFailure ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-500/40 bg-emerald-500/10")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {hasFailure ? <AlertTriangle className="h-4 w-4 text-amber-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
              {hasFailure ? "Some checks failed" : "Checks passed"}
            </div>
            <Button size="sm" onClick={runChecks} disabled={isRunning} className="bg-blue-600 hover:bg-blue-500">
              {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Recheck
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardContent className="p-4 space-y-3">
            {checks.map((item) => (
              <div key={item.key} className="rounded-lg border border-slate-700 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.state === "running" && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
                  {item.state === "pass" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {item.state === "fail" && <XCircle className="h-4 w-4 text-red-400" />}
                </div>
                <p className="mt-1 text-xs text-slate-300 break-all">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2"><Router className="h-4 w-4" />Next action</p>
            <p className="text-xs text-slate-300">Run this in PowerShell on your PC and confirm it shows <span className="font-semibold">TcpTestSucceeded : True</span>.</p>
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs font-mono break-all">{powershellRtspTest || "Set camera host first"}</div>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-100 hover:bg-slate-800"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(powershellRtspTest || "");
                  toast.success("Command copied");
                } catch {
                  toast.error("Unable to copy command");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy PowerShell Command
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Circle, QrCode, Router, Wifi } from "lucide-react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cameraService } from "@/services/cameraService";

const steps = [
  "Power on camera",
  "Select Wi-Fi",
  "Generate setup QR",
  "Camera scans and connects",
];

export default function CameraNetworkSetup() {
  const navigate = useNavigate();
  const { pondId = "" } = useParams<{ pondId: string }>();
  const [stepIndex, setStepIndex] = useState(1);
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const qrUrl = useMemo(() => {
    if (!ssid || !wifiPassword) return "";
    const payload = cameraService.createWifiSetupPayload(ssid, wifiPassword, deviceId);
    return cameraService.buildWifiSetupQrUrl(payload);
  }, [ssid, wifiPassword, deviceId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-8">
      <Header title="Wi-Fi Smartlink" showBack />

      <main className="p-4 max-w-xl mx-auto space-y-4">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step, index) => {
                const active = index <= stepIndex;
                const done = index < stepIndex;
                return (
                  <div key={step} className="text-center space-y-1">
                    <div className="mx-auto h-8 w-8 rounded-full flex items-center justify-center border border-slate-700 bg-slate-950">
                      {done ? <CheckCircle2 className="h-4 w-4 text-blue-400" /> : active ? <Wifi className="h-4 w-4 text-blue-400" /> : <Circle className="h-4 w-4 text-slate-500" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{step}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>Wi-Fi Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Wi-Fi SSID</Label>
              <Input value={ssid} onChange={(event) => setSsid(event.target.value)} placeholder="Pond Router Wi-Fi" className="bg-slate-950 border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label>Wi-Fi Password</Label>
              <Input type="password" value={wifiPassword} onChange={(event) => setWifiPassword(event.target.value)} placeholder="Router password" className="bg-slate-950 border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label>Device ID (optional)</Label>
              <Input value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder="e.g. 122577007" className="bg-slate-950 border-slate-700" />
            </div>

            {qrUrl ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 text-center space-y-3">
                <div className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <QrCode className="h-4 w-4 text-blue-400" />
                  Scan this QR with camera
                </div>
                <img src={qrUrl} alt="Wi-Fi setup QR code" className="mx-auto h-56 w-56 rounded-lg bg-white p-2" />
                <p className="text-xs text-slate-400">Keep phone, router, and camera close during setup.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-400">
                Enter Wi-Fi credentials to generate setup QR.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardContent className="p-4 space-y-2 text-sm text-slate-300">
            <p className="font-medium">Supported camera connection modes</p>
            <p>1. WiFi Camera</p>
            <p>2. Wired Camera (Ethernet)</p>
            <p>3. Local Network Camera</p>
            <p>4. RTSP IP Camera</p>
            <p>5. ESP32-CAM</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800" onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}>
            Previous
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-500" onClick={() => (stepIndex >= steps.length - 1 ? navigate(`/pond/${pondId}/cameras/add`) : setStepIndex((prev) => Math.min(steps.length - 1, prev + 1)))}>
            {stepIndex >= steps.length - 1 ? "Add Camera" : "Next"}
          </Button>
        </div>

        <Button variant="ghost" className="w-full text-blue-400 hover:text-blue-300 hover:bg-slate-900" onClick={() => navigate(`/pond/${pondId}/cameras`)}>
          <Router className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </main>
    </div>
  );
}

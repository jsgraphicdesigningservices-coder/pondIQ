import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cameraService } from "@/services/cameraService";
import { CameraConnectionType } from "@/types/camera";
import { isValidCameraURL } from "@/lib/cameraValidation";
import { toast } from "sonner";

export default function AddCamera() {
  const navigate = useNavigate();
  const { pondId = "" } = useParams<{ pondId: string }>();

  const [name, setName] = useState("Pond Camera");
  const [deviceId, setDeviceId] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("admin");
  const [streamUrl, setStreamUrl] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("554");
  const [connectionType, setConnectionType] = useState<CameraConnectionType>("wifi");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Camera name is required");
      return;
    }
    if (!password.trim()) {
      toast.error("Camera password is required");
      return;
    }

    if (!streamUrl.trim() && !ipAddress.trim()) {
      toast.error("Add camera IP or stream URL to bring camera online");
      return;
    }

    if (streamUrl.trim()) {
      const validation = isValidCameraURL(streamUrl.trim());
      if (!validation.valid) {
        toast.error(validation.error || "Invalid stream URL");
        return;
      }
    }

    setIsSaving(true);
    try {
      const camera = cameraService.addCamera({
        pondId,
        name,
        deviceId,
        password,
        username,
        streamUrl,
        ipAddress,
        port: Number.isFinite(Number(port)) ? Number(port) : 554,
        connectionType,
      });

      await cameraService.refreshStatus(camera.id);
      toast.success("Camera added successfully");
      navigate(`/pond/${pondId}/cameras`);
    } catch {
      toast.error("Failed to add camera");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-6">
      <Header title="Add Camera" showBack />

      <main className="p-4 max-w-xl mx-auto">
        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle>Register Camera</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Camera Name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Aerator Side Camera" className="bg-slate-950 border-slate-700" />
              </div>

              <div className="space-y-2">
                <Label>Connection Method</Label>
                <Select value={connectionType} onValueChange={(value) => setConnectionType(value as CameraConnectionType)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wifi">WiFi Camera</SelectItem>
                    <SelectItem value="wired">Wired Camera</SelectItem>
                    <SelectItem value="local">Local Network Camera</SelectItem>
                    <SelectItem value="rtsp">RTSP IP Camera</SelectItem>
                    <SelectItem value="esp32">ESP32-CAM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Device ID</Label>
                <Input value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder="e.g. 122577007" className="bg-slate-950 border-slate-700" />
                <p className="text-xs text-slate-400">Device ID alone cannot provide direct live stream playback without stream URL/IP.</p>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Camera password" className="bg-slate-950 border-slate-700" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} className="bg-slate-950 border-slate-700" />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input value={port} onChange={(event) => setPort(event.target.value)} className="bg-slate-950 border-slate-700" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Camera IP (optional)</Label>
                <Input value={ipAddress} onChange={(event) => setIpAddress(event.target.value)} placeholder="192.168.1.55" className="bg-slate-950 border-slate-700" />
                <p className="text-xs text-slate-400">Recommended for V380 local mode when camera and phone are on same LAN.</p>
              </div>

              <div className="space-y-2">
                <Label>Stream URL (optional)</Label>
                <Input
                  value={streamUrl}
                  onChange={(event) => setStreamUrl(event.target.value)}
                  placeholder="rtsp://username:password@ip:port/live"
                  className="bg-slate-950 border-slate-700"
                />
                <p className="text-xs text-slate-400">RTSP, HLS, MJPEG, or HTTP camera URLs are supported.</p>
              </div>

              <Button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                {isSaving ? "Adding camera..." : "Save Camera"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

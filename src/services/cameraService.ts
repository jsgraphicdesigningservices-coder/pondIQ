import { AddCameraInput, CameraErrorCode, PondCamera, WifiSetupPayload } from "@/types/camera";

const CAMERA_STORAGE_KEY = "aqua:pond-cameras:v1";

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cam_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readAll(): PondCamera[] {
  try {
    const raw = localStorage.getItem(CAMERA_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PondCamera[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(cameras: PondCamera[]) {
  localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(cameras));
}

function buildDefaultStreamUrl(input: AddCameraInput): string | undefined {
  if (input.streamUrl?.trim()) return input.streamUrl.trim();
  if (input.ipAddress?.trim()) {
    const port = input.port || 554;
    const user = input.username || "admin";
    const pass = encodeURIComponent(input.password || "");
    return `rtsp://${user}:${pass}@${input.ipAddress.trim()}:${port}/live`;
  }
  return undefined;
}

function errorFromConnection(error: CameraErrorCode) {
  switch (error) {
    case "not_configured":
      return "Camera is not configured with a stream URL/IP yet";
    case "wrong_password":
      return "Wrong camera password";
    case "network_timeout":
      return "Network timeout";
    case "offline":
      return "Camera offline";
    default:
      return "Unknown camera error";
  }
}

export const cameraService = {
  listByPond(pondId: string) {
    return readAll().filter((camera) => camera.pondId === pondId);
  },

  getById(id: string) {
    return readAll().find((camera) => camera.id === id) ?? null;
  },

  addCamera(input: AddCameraInput) {
    const cameras = readAll();
    const timestamp = nowIso();

    const newCamera: PondCamera = {
      id: createId(),
      pondId: input.pondId,
      name: input.name.trim(),
      deviceId: input.deviceId?.trim() || undefined,
      password: input.password,
      username: input.username?.trim() || undefined,
      ipAddress: input.ipAddress?.trim() || undefined,
      port: input.port,
      streamUrl: buildDefaultStreamUrl(input),
      thumbnailUrl: input.thumbnailUrl?.trim() || undefined,
      connectionType: input.connectionType,
      status: "connecting",
      lastError: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    cameras.push(newCamera);
    writeAll(cameras);
    return newCamera;
  },

  updateCamera(id: string, updates: Partial<PondCamera>) {
    const cameras = readAll();
    const index = cameras.findIndex((camera) => camera.id === id);
    if (index < 0) return null;

    cameras[index] = {
      ...cameras[index],
      ...updates,
      updatedAt: nowIso(),
    };

    writeAll(cameras);
    return cameras[index];
  },

  removeCamera(id: string) {
    const next = readAll().filter((camera) => camera.id !== id);
    writeAll(next);
  },

  async refreshStatus(id: string) {
    const camera = this.getById(id);
    if (!camera) {
      return { ok: false, error: "Camera not found" };
    }

    this.updateCamera(id, { status: "connecting", lastError: null });

    if (!camera.password || camera.password.length < 4) {
      this.updateCamera(id, { status: "error", lastError: "wrong_password" });
      return { ok: false, error: errorFromConnection("wrong_password") };
    }

    if (!camera.streamUrl && !camera.ipAddress) {
      this.updateCamera(id, { status: "error", lastError: "not_configured" });

      if (camera.deviceId && camera.connectionType === "wifi") {
        return {
          ok: false,
          error: "V380 Device ID mode requires RTSP/HLS stream URL or camera IP for direct app playback",
        };
      }

      return { ok: false, error: errorFromConnection("not_configured") };
    }

    // Browser clients cannot directly probe RTSP endpoints, so we treat RTSP as reachable
    // and defer definitive connectivity checks to native/runtime players.
    if (camera.streamUrl?.startsWith("rtsp://")) {
      this.updateCamera(id, { status: "online", lastError: null, lastSeen: nowIso() });
      return { ok: true, error: null };
    }

    if (!camera.streamUrl) {
      this.updateCamera(id, { status: "error", lastError: "not_configured" });
      return { ok: false, error: errorFromConnection("not_configured") };
    }

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);

    try {
      await fetch(camera.streamUrl, { method: "HEAD", signal: ctrl.signal, mode: "no-cors" });
      this.updateCamera(id, { status: "online", lastError: null, lastSeen: nowIso() });
      return { ok: true, error: null };
    } catch {
      this.updateCamera(id, { status: "error", lastError: "offline" });
      return { ok: false, error: errorFromConnection("offline") };
    } finally {
      clearTimeout(timeout);
    }
  },

  createWifiSetupPayload(ssid: string, password: string, deviceId?: string): WifiSetupPayload {
    return {
      ssid: ssid.trim(),
      password,
      deviceId: deviceId?.trim() || undefined,
      type: "v380_qr_setup",
    };
  },

  buildWifiSetupQrUrl(payload: WifiSetupPayload) {
    const encoded = encodeURIComponent(JSON.stringify(payload));
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
  },

  buildGo2RtcHlsUrl(rtspUrl: string, relayBase = "http://localhost:1984") {
    const cleanBase = relayBase.replace(/\/$/, "");
    return `${cleanBase}/api/stream.m3u8?src=${rtspUrl}&mp4`;
  },

  buildGo2RtcNamedHlsUrl(streamName: string, relayBase = "http://localhost:1984") {
    const cleanBase = relayBase.replace(/\/$/, "");
    return `${cleanBase}/api/stream.m3u8?src=${encodeURIComponent(streamName)}&mp4`;
  },

  async registerGo2RtcStream(rtspUrl: string, streamName: string, relayBase = "http://localhost:1984") {
    const cleanBase = relayBase.replace(/\/$/, "");
    const url = `${cleanBase}/api/streams?src=${encodeURIComponent(rtspUrl)}&name=${encodeURIComponent(streamName)}`;

    const response = await fetch(url, { method: "PUT" });
    if (!response.ok) {
      throw new Error(`Relay registration failed (${response.status})`);
    }

    return this.buildGo2RtcNamedHlsUrl(streamName, relayBase);
  },

  async sendPtzCommand(id: string, command: "up" | "down" | "left" | "right" | "zoom_in" | "zoom_out") {
    const camera = this.getById(id);
    if (!camera) {
      return { ok: false, error: "Camera not found" };
    }

    // Placeholder for ONVIF/PTZ command transport integration.
    await new Promise((resolve) => setTimeout(resolve, 180));
    return { ok: true, command };
  },
};

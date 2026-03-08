export type CameraConnectionType = "wifi" | "wired" | "local" | "rtsp" | "esp32";

export type CameraStatus = "online" | "offline" | "connecting" | "error";

export type CameraErrorCode = "offline" | "wrong_password" | "network_timeout" | "not_configured" | null;

export interface PondCamera {
  id: string;
  pondId: string;
  name: string;
  deviceId?: string;
  password: string;
  username?: string;
  ipAddress?: string;
  port?: number;
  streamUrl?: string;
  thumbnailUrl?: string;
  connectionType: CameraConnectionType;
  status: CameraStatus;
  lastError: CameraErrorCode;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddCameraInput {
  pondId: string;
  name: string;
  deviceId?: string;
  password: string;
  username?: string;
  ipAddress?: string;
  port?: number;
  streamUrl?: string;
  thumbnailUrl?: string;
  connectionType: CameraConnectionType;
}

export interface WifiSetupPayload {
  ssid: string;
  password: string;
  deviceId?: string;
  type: "v380_qr_setup";
}

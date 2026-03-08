package com.aquasmartpond.camera.model

import java.util.UUID

data class CameraConfig(
    val pondId: String,
    val rtspUrl: String,
    val username: String,
    val password: String,
    val onvifControlUrl: String? = null,
    val motionDetectionEnabled: Boolean = false,
    val motionSensitivity: Int = 50
)

enum class StreamType {
    RTSP,
    MJPEG
}

data class CameraDevice(
    val id: String = UUID.randomUUID().toString(),
    val pondId: String,
    val cameraName: String,
    val ipAddress: String,
    val port: Int = 554,
    val streamType: StreamType = StreamType.RTSP,
    val rtspUrl: String? = null,
    val mjpegUrl: String? = null,
    val username: String = "",
    val password: String = "",
    val motionDetectionEnabled: Boolean = false,
    val motionSensitivity: Int = 50,
    val motionAlertPushEnabled: Boolean = true,
    val scheduledRecordingEnabled: Boolean = false,
    val scheduleStartHour: Int = 0,
    val scheduleEndHour: Int = 0,
    val streamQuality: StreamQuality = StreamQuality.HD,
    val frameRate: Int = 25,
    val resolution: String = "1920x1080",
    val micEnabled: Boolean = true,
    val nightModeEnabled: Boolean = false,
    val lastKnownOnline: Boolean = false,
    val aiFishMovementEnabled: Boolean = false,
    val aiPondAlertEnabled: Boolean = false,
    val aiWaterLevelEnabled: Boolean = false
)

enum class StreamQuality {
    LOW,
    MEDIUM,
    HD,
    SD
}

enum class PtzCommand {
    PAN_LEFT,
    PAN_RIGHT,
    TILT_UP,
    TILT_DOWN,
    ZOOM_IN,
    ZOOM_OUT
}

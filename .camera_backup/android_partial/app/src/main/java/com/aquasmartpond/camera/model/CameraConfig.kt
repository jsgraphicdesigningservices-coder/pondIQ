package com.aquasmartpond.camera.model

data class CameraConfig(
    val pondId: String,
    val rtspUrl: String,
    val username: String,
    val password: String,
    val onvifControlUrl: String? = null,
    val motionDetectionEnabled: Boolean = false,
    val motionSensitivity: Int = 50
)

enum class StreamQuality {
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

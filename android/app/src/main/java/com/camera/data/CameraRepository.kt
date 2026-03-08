package com.aquasmartpond.camera.data

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.util.Base64
import com.aquasmartpond.camera.model.CameraConfig
import com.aquasmartpond.camera.model.CameraDevice
import com.aquasmartpond.camera.model.PtzCommand
import com.aquasmartpond.camera.model.StreamQuality
import com.aquasmartpond.camera.model.StreamType
import java.io.File
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CameraRepository(private val context: Context) {
    private val prefs = context.getSharedPreferences("pond_camera_config", Context.MODE_PRIVATE)
    private val activeRecordingSessionByPond = mutableMapOf<String, Long>()

    private fun cameraIndexKey(pondId: String): String = "camera_index_$pondId"
    private fun cameraPrefKey(pondId: String, cameraId: String): String = "camera_device_${pondId}_$cameraId"

    private fun encode(raw: String): String = Base64.encodeToString(raw.toByteArray(), Base64.NO_WRAP)
    private fun decode(raw: String): String = String(Base64.decode(raw, Base64.NO_WRAP))

    fun saveCameraConfig(config: CameraConfig) {
        // Keep old API behavior by storing a default camera per pond.
        val existing = getCameras(config.pondId).firstOrNull()
        val camera = CameraDevice(
            id = existing?.id ?: "default_${config.pondId}",
            pondId = config.pondId,
            cameraName = existing?.cameraName ?: "Pond ${config.pondId}",
            ipAddress = existing?.ipAddress ?: "",
            port = existing?.port ?: 554,
            streamType = if (existing?.streamType == StreamType.MJPEG) StreamType.MJPEG else StreamType.RTSP,
            rtspUrl = config.rtspUrl,
            mjpegUrl = existing?.mjpegUrl,
            username = config.username,
            password = config.password,
            motionDetectionEnabled = config.motionDetectionEnabled,
            motionSensitivity = config.motionSensitivity,
            motionAlertPushEnabled = existing?.motionAlertPushEnabled ?: true,
            scheduledRecordingEnabled = existing?.scheduledRecordingEnabled ?: false,
            scheduleStartHour = existing?.scheduleStartHour ?: 0,
            scheduleEndHour = existing?.scheduleEndHour ?: 0,
            streamQuality = existing?.streamQuality ?: StreamQuality.HD,
            frameRate = existing?.frameRate ?: 25,
            resolution = existing?.resolution ?: "1920x1080",
            micEnabled = existing?.micEnabled ?: true,
            nightModeEnabled = existing?.nightModeEnabled ?: false,
            lastKnownOnline = existing?.lastKnownOnline ?: false,
            aiFishMovementEnabled = existing?.aiFishMovementEnabled ?: false,
            aiPondAlertEnabled = existing?.aiPondAlertEnabled ?: false,
            aiWaterLevelEnabled = existing?.aiWaterLevelEnabled ?: false
        )
        saveCameraDevice(camera)
    }

    fun getCameraConfig(pondId: String): CameraConfig? {
        val camera = getCameras(pondId).firstOrNull() ?: return null
        return camera.toCameraConfig()
    }

    fun saveCameraDevice(camera: CameraDevice) {
        val encoded = listOf(
            encode(camera.id),
            encode(camera.pondId),
            encode(camera.cameraName),
            encode(camera.ipAddress),
            camera.port.toString(),
            camera.streamType.name,
            encode(camera.rtspUrl.orEmpty()),
            encode(camera.mjpegUrl.orEmpty()),
            encode(camera.username),
            encode(camera.password),
            camera.motionDetectionEnabled.toString(),
            camera.motionSensitivity.toString(),
            camera.motionAlertPushEnabled.toString(),
            camera.scheduledRecordingEnabled.toString(),
            camera.scheduleStartHour.toString(),
            camera.scheduleEndHour.toString(),
            camera.streamQuality.name,
            camera.frameRate.toString(),
            encode(camera.resolution),
            camera.micEnabled.toString(),
            camera.nightModeEnabled.toString(),
            camera.lastKnownOnline.toString(),
            camera.aiFishMovementEnabled.toString(),
            camera.aiPondAlertEnabled.toString(),
            camera.aiWaterLevelEnabled.toString()
        ).joinToString("||")

        val ids = getCameraIds(camera.pondId).toMutableSet()
        ids.add(camera.id)

        prefs.edit()
            .putString(cameraPrefKey(camera.pondId, camera.id), encoded)
            .putStringSet(cameraIndexKey(camera.pondId), ids)
            .apply()
    }

    fun getCameras(pondId: String): List<CameraDevice> {
        return getCameraIds(pondId).mapNotNull { getCameraById(pondId, it) }
            .sortedBy { it.cameraName.lowercase(Locale.US) }
    }

    fun getCameraById(pondId: String, cameraId: String): CameraDevice? {
        val raw = prefs.getString(cameraPrefKey(pondId, cameraId), null) ?: return null
        val parts = raw.split("||")
        if (parts.size < 25) return null

        return CameraDevice(
            id = decode(parts[0]),
            pondId = decode(parts[1]),
            cameraName = decode(parts[2]),
            ipAddress = decode(parts[3]),
            port = parts[4].toIntOrNull() ?: 554,
            streamType = runCatching { StreamType.valueOf(parts[5]) }.getOrDefault(StreamType.RTSP),
            rtspUrl = decode(parts[6]).ifBlank { null },
            mjpegUrl = decode(parts[7]).ifBlank { null },
            username = decode(parts[8]),
            password = decode(parts[9]),
            motionDetectionEnabled = parts[10].toBoolean(),
            motionSensitivity = parts[11].toIntOrNull() ?: 50,
            motionAlertPushEnabled = parts[12].toBoolean(),
            scheduledRecordingEnabled = parts[13].toBoolean(),
            scheduleStartHour = parts[14].toIntOrNull() ?: 0,
            scheduleEndHour = parts[15].toIntOrNull() ?: 0,
            streamQuality = runCatching { StreamQuality.valueOf(parts[16]) }.getOrDefault(StreamQuality.HD),
            frameRate = parts[17].toIntOrNull() ?: 25,
            resolution = decode(parts[18]).ifBlank { "1920x1080" },
            micEnabled = parts[19].toBoolean(),
            nightModeEnabled = parts[20].toBoolean(),
            lastKnownOnline = parts[21].toBoolean(),
            aiFishMovementEnabled = parts[22].toBoolean(),
            aiPondAlertEnabled = parts[23].toBoolean(),
            aiWaterLevelEnabled = parts[24].toBoolean()
        )
    }

    fun deleteCamera(pondId: String, cameraId: String) {
        val ids = getCameraIds(pondId).toMutableSet()
        ids.remove(cameraId)
        prefs.edit()
            .remove(cameraPrefKey(pondId, cameraId))
            .putStringSet(cameraIndexKey(pondId), ids)
            .apply()
    }

    private fun getCameraIds(pondId: String): Set<String> {
        return prefs.getStringSet(cameraIndexKey(pondId), emptySet()) ?: emptySet()
    }

    fun buildRtspUri(config: CameraConfig, quality: StreamQuality): Uri {
        val device = CameraDevice(
            pondId = config.pondId,
            cameraName = "Pond ${config.pondId}",
            ipAddress = "",
            streamType = StreamType.RTSP,
            rtspUrl = config.rtspUrl,
            username = config.username,
            password = config.password,
            streamQuality = quality,
            motionDetectionEnabled = config.motionDetectionEnabled,
            motionSensitivity = config.motionSensitivity
        )
        return buildRtspUri(device, quality)
    }

    fun buildRtspUri(camera: CameraDevice, quality: StreamQuality = camera.streamQuality): Uri {
        val baseRtsp = camera.rtspUrl
            ?: "rtsp://${camera.ipAddress}:${camera.port}/stream"
        val authRtsp = if (camera.username.isNotBlank()) {
            val user = URLEncoder.encode(camera.username, Charsets.UTF_8.name())
            val pass = URLEncoder.encode(camera.password, Charsets.UTF_8.name())
            val withoutScheme = baseRtsp.removePrefix("rtsp://")
            "rtsp://$user:$pass@$withoutScheme"
        } else {
            baseRtsp
        }

        val withQuality = when (quality) {
            StreamQuality.LOW -> "$authRtsp?stream=low"
            StreamQuality.MEDIUM -> "$authRtsp?stream=medium"
            StreamQuality.HD -> "$authRtsp?stream=hd"
            StreamQuality.SD -> "$authRtsp?stream=sd"
        }
        return Uri.parse(withQuality)
    }

    fun buildMjpegUri(camera: CameraDevice): Uri {
        val base = camera.mjpegUrl ?: "http://${camera.ipAddress}:81/stream"
        if (camera.username.isBlank()) return Uri.parse(base)

        val noScheme = base.removePrefix("http://").removePrefix("https://")
        val user = URLEncoder.encode(camera.username, Charsets.UTF_8.name())
        val pass = URLEncoder.encode(camera.password, Charsets.UTF_8.name())
        return Uri.parse("http://$user:$pass@$noScheme")
    }

    fun buildEsp32CaptureUri(camera: CameraDevice): Uri {
        return Uri.parse("http://${camera.ipAddress}/capture")
    }

    fun sendPtzCommand(config: CameraConfig, command: PtzCommand): Boolean {
        val endpoint = config.onvifControlUrl ?: return false
        if (endpoint.isBlank()) return false
        return true
    }

    fun updateCameraOnlineStatus(pondId: String, cameraId: String, online: Boolean) {
        val camera = getCameraById(pondId, cameraId) ?: return
        saveCameraDevice(camera.copy(lastKnownOnline = online))
    }

    fun startRecording(config: CameraConfig, quality: StreamQuality): File? {
        val camera = getCameras(config.pondId).firstOrNull() ?: return null
        return startRecording(camera, quality)
    }

    fun startRecording(camera: CameraDevice, quality: StreamQuality = camera.streamQuality): File? {
        val outputDir = File(
            context.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
            "AquaPondRecordings/${camera.pondId}/${camera.id}"
        )
        if (!outputDir.exists()) outputDir.mkdirs()

        val suffix = when (quality) {
            StreamQuality.LOW -> "low"
            StreamQuality.MEDIUM -> "mid"
            StreamQuality.HD -> "hd"
            StreamQuality.SD -> "sd"
        }
        val filename = "rec_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}_$suffix.mp4"
        val outputFile = File(outputDir, filename)
        val now = System.currentTimeMillis()
        activeRecordingSessionByPond[camera.id] = now
        if (!outputFile.exists()) outputFile.createNewFile()
        return outputFile
    }

    fun stopRecording(pondId: String): Boolean {
        val camera = getCameras(pondId).firstOrNull() ?: return false
        return stopRecording(camera.id)
    }

    fun stopRecording(cameraId: String): Boolean {
        return activeRecordingSessionByPond.remove(cameraId) != null
    }

    fun listRecordings(pondId: String): List<File> {
        val allCameraDirs = File(
            context.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
            "AquaPondRecordings/$pondId"
        )
        if (!allCameraDirs.exists() || !allCameraDirs.isDirectory) return emptyList()

        return allCameraDirs.listFiles()
            ?.filter { it.isDirectory }
            ?.flatMap { cameraFolder ->
                cameraFolder.listFiles()?.filter { file ->
                    file.isFile && (file.extension == "mp4" || file.extension == "mkv")
                } ?: emptyList()
            }
            ?.sortedByDescending { it.lastModified() }
            ?: emptyList()
    }

    fun saveSnapshot(pondId: String, cameraId: String, imageBytes: ByteArray): File? {
        val folder = File(
            context.getExternalFilesDir(Environment.DIRECTORY_PICTURES),
            "AquaPondSnapshots/$pondId/$cameraId"
        )
        if (!folder.exists()) folder.mkdirs()

        val file = File(
            folder,
            "snap_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.jpg"
        )
        return runCatching {
            file.outputStream().use { it.write(imageBytes) }
            file
        }.getOrNull()
    }

    fun listSnapshots(pondId: String): List<File> {
        val folder = File(
            context.getExternalFilesDir(Environment.DIRECTORY_PICTURES),
            "AquaPondSnapshots/$pondId"
        )
        if (!folder.exists() || !folder.isDirectory) return emptyList()

        return folder.walkTopDown()
            .maxDepth(2)
            .filter { it.isFile && it.extension.equals("jpg", ignoreCase = true) }
            .toList()
            .sortedByDescending { it.lastModified() }
    }

    private fun CameraDevice.toCameraConfig(): CameraConfig {
        return CameraConfig(
            pondId = pondId,
            rtspUrl = rtspUrl ?: "rtsp://$ipAddress:$port/stream",
            username = username,
            password = password,
            onvifControlUrl = null,
            motionDetectionEnabled = motionDetectionEnabled,
            motionSensitivity = motionSensitivity
        )
    }
}

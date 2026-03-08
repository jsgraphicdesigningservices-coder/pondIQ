package com.aquasmartpond.camera.data

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.util.Base64
import com.aquasmartpond.camera.model.CameraConfig
import com.aquasmartpond.camera.model.PtzCommand
import com.aquasmartpond.camera.model.StreamQuality
import com.arthenica.ffmpegkit.FFmpegKit
import java.io.File
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CameraRepository(private val context: Context) {
    private val prefs = context.getSharedPreferences("pond_camera_config", Context.MODE_PRIVATE)
    private val activeRecordingSessionByPond = mutableMapOf<String, Long>()

    fun saveCameraConfig(config: CameraConfig) {
        val key = "camera_${config.pondId}"
        val encoded = listOf(
            config.pondId,
            config.rtspUrl,
            config.username,
            Base64.encodeToString(config.password.toByteArray(), Base64.NO_WRAP),
            config.onvifControlUrl ?: "",
            config.motionDetectionEnabled.toString(),
            config.motionSensitivity.toString()
        ).joinToString("||")
        prefs.edit().putString(key, encoded).apply()
    }

    fun getCameraConfig(pondId: String): CameraConfig? {
        val raw = prefs.getString("camera_$pondId", null) ?: return null
        val parts = raw.split("||")
        if (parts.size < 7) return null

        return CameraConfig(
            pondId = parts[0],
            rtspUrl = parts[1],
            username = parts[2],
            password = String(Base64.decode(parts[3], Base64.NO_WRAP)),
            onvifControlUrl = parts[4].ifBlank { null },
            motionDetectionEnabled = parts[5].toBoolean(),
            motionSensitivity = parts[6].toIntOrNull() ?: 50
        )
    }

    fun buildRtspUri(config: CameraConfig, quality: StreamQuality): Uri {
        val authRtsp = if (config.username.isNotBlank()) {
            val user = URLEncoder.encode(config.username, Charsets.UTF_8.name())
            val pass = URLEncoder.encode(config.password, Charsets.UTF_8.name())
            val withoutScheme = config.rtspUrl.removePrefix("rtsp://")
            "rtsp://$user:$pass@$withoutScheme"
        } else {
            config.rtspUrl
        }

        val withQuality = when (quality) {
            StreamQuality.HD -> "$authRtsp?stream=hd"
            StreamQuality.SD -> "$authRtsp?stream=sd"
        }
        return Uri.parse(withQuality)
    }

    fun sendPtzCommand(config: CameraConfig, command: PtzCommand): Boolean {
        val endpoint = config.onvifControlUrl ?: return false
        if (endpoint.isBlank()) return false
        return true
    }

    fun startRecording(config: CameraConfig, quality: StreamQuality): File? {
        val outputDir = File(
            context.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
            "AquaPondRecordings/${config.pondId}"
        )
        if (!outputDir.exists()) outputDir.mkdirs()

        val filename = "rec_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.mp4"
        val outputFile = File(outputDir, filename)
        val inputUrl = buildRtspUri(config, quality).toString()
        val command = "-rtsp_transport tcp -i \"$inputUrl\" -c copy -f mp4 \"${outputFile.absolutePath}\""

        val session = FFmpegKit.executeAsync(command) {}
        activeRecordingSessionByPond[config.pondId] = session.sessionId
        return outputFile
    }

    fun stopRecording(pondId: String): Boolean {
        val sessionId = activeRecordingSessionByPond.remove(pondId) ?: return false
        FFmpegKit.cancel(sessionId)
        return true
    }

    fun listRecordings(pondId: String): List<File> {
        val folder = File(
            context.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
            "AquaPondRecordings/$pondId"
        )
        if (!folder.exists() || !folder.isDirectory) return emptyList()

        return folder.listFiles()
            ?.filter { it.isFile && (it.extension == "mp4" || it.extension == "mkv") }
            ?.sortedByDescending { it.lastModified() }
            ?: emptyList()
    }
}

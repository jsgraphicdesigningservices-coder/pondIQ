package com.aquasmartpond.camera.ui

import android.net.Uri
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.aquasmartpond.camera.data.CameraRepository
import com.aquasmartpond.camera.model.CameraConfig
import com.aquasmartpond.camera.model.CameraDevice
import com.aquasmartpond.camera.model.PtzCommand
import com.aquasmartpond.camera.model.StreamQuality
import com.aquasmartpond.camera.model.StreamType

class CameraViewModel(private val repository: CameraRepository) : ViewModel() {
    private val _cameraConfig = MutableLiveData<CameraConfig?>()
    val cameraConfig: LiveData<CameraConfig?> = _cameraConfig

    private val _cameraList = MutableLiveData<List<CameraDevice>>(emptyList())
    val cameraList: LiveData<List<CameraDevice>> = _cameraList

    private val _activeCamera = MutableLiveData<CameraDevice?>()
    val activeCamera: LiveData<CameraDevice?> = _activeCamera

    private val _streamQuality = MutableLiveData(StreamQuality.HD)
    val streamQuality: LiveData<StreamQuality> = _streamQuality

    private val _isRecording = MutableLiveData(false)
    val isRecording: LiveData<Boolean> = _isRecording

    private val _connectionStatus = MutableLiveData("Connecting")
    val connectionStatus: LiveData<String> = _connectionStatus

    private var currentPondId: String = ""

    fun loadCameras(pondId: String) {
        currentPondId = pondId
        _cameraList.value = repository.getCameras(pondId)
        _activeCamera.value = _cameraList.value?.firstOrNull()
        _cameraConfig.value = _activeCamera.value?.let {
            CameraConfig(
                pondId = it.pondId,
                rtspUrl = it.rtspUrl ?: "rtsp://${it.ipAddress}:${it.port}/stream",
                username = it.username,
                password = it.password,
                motionDetectionEnabled = it.motionDetectionEnabled,
                motionSensitivity = it.motionSensitivity
            )
        }
    }

    fun loadCameraById(pondId: String, cameraId: String) {
        currentPondId = pondId
        val camera = repository.getCameraById(pondId, cameraId)
        _activeCamera.value = camera
        _cameraConfig.value = camera?.let {
            CameraConfig(
                pondId = it.pondId,
                rtspUrl = it.rtspUrl ?: "rtsp://${it.ipAddress}:${it.port}/stream",
                username = it.username,
                password = it.password,
                motionDetectionEnabled = it.motionDetectionEnabled,
                motionSensitivity = it.motionSensitivity
            )
        }
        _streamQuality.value = camera?.streamQuality ?: StreamQuality.HD
        _cameraList.value = repository.getCameras(pondId)
    }

    fun loadCamera(pondId: String) {
        loadCameras(pondId)
    }

    fun saveCamera(config: CameraConfig) {
        repository.saveCameraConfig(config)
        _cameraConfig.value = config
        if (currentPondId.isNotBlank()) {
            _cameraList.value = repository.getCameras(currentPondId)
        }
    }

    fun saveCameraDevice(camera: CameraDevice) {
        repository.saveCameraDevice(camera)
        _activeCamera.value = camera
        _cameraConfig.value = CameraConfig(
            pondId = camera.pondId,
            rtspUrl = camera.rtspUrl ?: "rtsp://${camera.ipAddress}:${camera.port}/stream",
            username = camera.username,
            password = camera.password,
            motionDetectionEnabled = camera.motionDetectionEnabled,
            motionSensitivity = camera.motionSensitivity
        )
        _streamQuality.value = camera.streamQuality
        _cameraList.value = repository.getCameras(camera.pondId)
    }

    fun deleteCamera(pondId: String, cameraId: String) {
        repository.deleteCamera(pondId, cameraId)
        val remaining = repository.getCameras(pondId)
        _cameraList.value = remaining
        if (_activeCamera.value?.id == cameraId) {
            _activeCamera.value = remaining.firstOrNull()
        }
    }

    fun selectCamera(cameraId: String) {
        val pond = currentPondId.ifBlank { _activeCamera.value?.pondId.orEmpty() }
        if (pond.isBlank()) return
        val camera = repository.getCameraById(pond, cameraId) ?: return
        _activeCamera.value = camera
        _streamQuality.value = camera.streamQuality
    }

    fun setQuality(quality: StreamQuality) {
        _streamQuality.value = quality
        val active = _activeCamera.value ?: return
        saveCameraDevice(active.copy(streamQuality = quality))
    }

    fun sendPtz(command: PtzCommand): Boolean {
        val config = _cameraConfig.value ?: return false
        return repository.sendPtzCommand(config, command)
    }

    fun startRecording(): Boolean {
        val camera = _activeCamera.value ?: return false
        val quality = _streamQuality.value ?: camera.streamQuality
        val created = repository.startRecording(camera, quality) != null
        _isRecording.value = created
        return created
    }

    fun stopRecording(): Boolean {
        val camera = _activeCamera.value ?: return false
        val stopped = repository.stopRecording(camera.id)
        _isRecording.value = false
        return stopped
    }

    fun updateConnectionStatus(status: String) {
        _connectionStatus.value = status
    }

    fun updateMotionSettings(enabled: Boolean, sensitivity: Int) {
        val camera = _activeCamera.value ?: return
        saveCameraDevice(camera.copy(motionDetectionEnabled = enabled, motionSensitivity = sensitivity))
    }

    fun recordingsForPond(): List<java.io.File> {
        val camera = _activeCamera.value ?: return emptyList()
        return repository.listRecordings(camera.pondId)
    }

    fun snapshotsForPond(): List<java.io.File> {
        val camera = _activeCamera.value ?: return emptyList()
        return repository.listSnapshots(camera.pondId)
    }

    fun recordSnapshot(imageBytes: ByteArray): Boolean {
        val camera = _activeCamera.value ?: return false
        return repository.saveSnapshot(camera.pondId, camera.id, imageBytes) != null
    }

    fun markOnline(online: Boolean) {
        val camera = _activeCamera.value ?: return
        repository.updateCameraOnlineStatus(camera.pondId, camera.id, online)
        _activeCamera.value = camera.copy(lastKnownOnline = online)
    }

    fun getRtspUrlForActive(): Uri? {
        val camera = _activeCamera.value ?: return null
        return repository.buildRtspUri(camera, _streamQuality.value ?: camera.streamQuality)
    }

    fun getMjpegUrlForActive(): Uri? {
        val camera = _activeCamera.value ?: return null
        return repository.buildMjpegUri(camera)
    }

    fun activeStreamType(): StreamType {
        return _activeCamera.value?.streamType ?: StreamType.RTSP
    }
}

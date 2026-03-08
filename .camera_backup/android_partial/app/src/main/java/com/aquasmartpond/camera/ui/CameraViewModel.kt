package com.aquasmartpond.camera.ui

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.aquasmartpond.camera.data.CameraRepository
import com.aquasmartpond.camera.model.CameraConfig
import com.aquasmartpond.camera.model.PtzCommand
import com.aquasmartpond.camera.model.StreamQuality

class CameraViewModel(private val repository: CameraRepository) : ViewModel() {
    private val _cameraConfig = MutableLiveData<CameraConfig?>()
    val cameraConfig: LiveData<CameraConfig?> = _cameraConfig

    private val _streamQuality = MutableLiveData(StreamQuality.HD)
    val streamQuality: LiveData<StreamQuality> = _streamQuality

    private val _isRecording = MutableLiveData(false)
    val isRecording: LiveData<Boolean> = _isRecording

    private val _connectionStatus = MutableLiveData("Connecting")
    val connectionStatus: LiveData<String> = _connectionStatus

    fun loadCamera(pondId: String) {
        _cameraConfig.value = repository.getCameraConfig(pondId)
    }

    fun saveCamera(config: CameraConfig) {
        repository.saveCameraConfig(config)
        _cameraConfig.value = config
    }

    fun setQuality(quality: StreamQuality) {
        _streamQuality.value = quality
    }

    fun sendPtz(command: PtzCommand): Boolean {
        val config = _cameraConfig.value ?: return false
        return repository.sendPtzCommand(config, command)
    }

    fun startRecording(): Boolean {
        val config = _cameraConfig.value ?: return false
        val quality = _streamQuality.value ?: StreamQuality.HD
        val created = repository.startRecording(config, quality) != null
        _isRecording.value = created
        return created
    }

    fun stopRecording(): Boolean {
        val config = _cameraConfig.value ?: return false
        val stopped = repository.stopRecording(config.pondId)
        _isRecording.value = false
        return stopped
    }

    fun updateConnectionStatus(status: String) {
        _connectionStatus.value = status
    }

    fun updateMotionSettings(enabled: Boolean, sensitivity: Int) {
        val config = _cameraConfig.value ?: return
        saveCamera(
            config.copy(
                motionDetectionEnabled = enabled,
                motionSensitivity = sensitivity
            )
        )
    }

    fun recordingsForPond(): List<java.io.File> {
        val config = _cameraConfig.value ?: return emptyList()
        return repository.listRecordings(config.pondId)
    }
}

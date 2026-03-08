package com.aquasmartpond.camera.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.SeekBar
import android.widget.Switch
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.aquasmartpond.R
import com.aquasmartpond.camera.data.CameraRepository
import com.aquasmartpond.camera.model.CameraConfig

class CameraSettingsActivity : AppCompatActivity() {

    companion object {
        private const val EXTRA_POND_ID = "extra_pond_id"

        fun newIntent(context: Context, pondId: String) =
            Intent(context, CameraSettingsActivity::class.java).putExtra(EXTRA_POND_ID, pondId)
    }

    private val viewModel: CameraViewModel by viewModels {
        CameraViewModelFactory(CameraRepository(applicationContext))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera_settings)

        val pondId = intent.getStringExtra(EXTRA_POND_ID).orEmpty()
        if (pondId.isBlank()) {
            finish()
            return
        }

        val rtspInput = findViewById<EditText>(R.id.inputRtsp)
        val userInput = findViewById<EditText>(R.id.inputUsername)
        val passInput = findViewById<EditText>(R.id.inputPassword)
        val onvifInput = findViewById<EditText>(R.id.inputOnvif)
        val motionSwitch = findViewById<Switch>(R.id.switchMotionDetectionSettings)
        val sensitivity = findViewById<SeekBar>(R.id.seekMotionSensitivitySettings)
        val saveButton = findViewById<Button>(R.id.btnSaveCameraSettings)
        val playbackButton = findViewById<Button>(R.id.btnOpenPlayback)

        viewModel.loadCamera(pondId)
        viewModel.cameraConfig.observe(this) { config ->
            config ?: return@observe
            rtspInput.setText(config.rtspUrl)
            userInput.setText(config.username)
            passInput.setText(config.password)
            onvifInput.setText(config.onvifControlUrl.orEmpty())
            motionSwitch.isChecked = config.motionDetectionEnabled
            sensitivity.progress = config.motionSensitivity
        }

        saveButton.setOnClickListener {
            val newConfig = CameraConfig(
                pondId = pondId,
                rtspUrl = rtspInput.text.toString().trim(),
                username = userInput.text.toString().trim(),
                password = passInput.text.toString(),
                onvifControlUrl = onvifInput.text.toString().trim().ifBlank { null },
                motionDetectionEnabled = motionSwitch.isChecked,
                motionSensitivity = sensitivity.progress
            )
            viewModel.saveCamera(newConfig)
            Toast.makeText(this, "Camera settings saved", Toast.LENGTH_SHORT).show()
        }

        playbackButton.setOnClickListener {
            startActivity(CameraPlaybackActivity.newIntent(this, pondId))
        }
    }
}

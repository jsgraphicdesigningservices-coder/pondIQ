package com.aquasmartpond.camera.ui

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.SeekBar
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.aquasmartpond.R
import com.aquasmartpond.camera.data.CameraRepository
import com.aquasmartpond.camera.model.PtzCommand
import com.aquasmartpond.camera.model.StreamQuality
import com.aquasmartpond.camera.util.CameraNotificationHelper
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CameraLiveActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_POND_ID = "extra_pond_id"

        fun newIntent(context: Context, pondId: String) =
            android.content.Intent(context, CameraLiveActivity::class.java)
                .putExtra(EXTRA_POND_ID, pondId)
    }

    private val viewModel: CameraViewModel by viewModels {
        CameraViewModelFactory(CameraRepository(applicationContext))
    }

    private lateinit var playerView: PlayerView
    private lateinit var statusText: TextView
    private lateinit var statusDot: View
    private lateinit var motionIcon: ImageView
    private var player: ExoPlayer? = null
    private var pondId: String = ""
    private var isMuted = false
    private var isFullScreen = false
    private var offlineNotified = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera_live)

        pondId = intent.getStringExtra(EXTRA_POND_ID).orEmpty()
        if (pondId.isBlank()) {
            finish()
            return
        }

        playerView = findViewById(R.id.playerView)
        statusText = findViewById(R.id.connectionStatusText)
        statusDot = findViewById(R.id.connectionStatusDot)
        motionIcon = findViewById(R.id.motionAlertIcon)

        val notificationHelper = CameraNotificationHelper(this)
        notificationHelper.ensureChannel()

        bindControls(notificationHelper)
        observeState(notificationHelper)
        viewModel.loadCamera(pondId)
    }

    private fun bindControls(notificationHelper: CameraNotificationHelper) {
        findViewById<ImageButton>(R.id.btnFullScreen).setOnClickListener {
            isFullScreen = !isFullScreen
            if (isFullScreen) {
                WindowCompat.setDecorFitsSystemWindows(window, false)
            } else {
                WindowCompat.setDecorFitsSystemWindows(window, true)
            }
        }

        findViewById<ImageButton>(R.id.btnMute).setOnClickListener {
            isMuted = !isMuted
            player?.volume = if (isMuted) 0f else 1f
        }

        findViewById<ImageButton>(R.id.btnScreenshot).setOnClickListener {
            val captured = capturePlayerView(playerView)
            if (captured != null) {
                saveBitmapToGallery(captured)
                Toast.makeText(this, "Screenshot saved", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Failed to capture screenshot", Toast.LENGTH_SHORT).show()
            }
        }

        val recordBtn = findViewById<ImageButton>(R.id.btnRecord)
        recordBtn.setOnClickListener {
            val recording = viewModel.isRecording.value == true
            val ok = if (recording) viewModel.stopRecording() else viewModel.startRecording()
            if (ok) {
                Toast.makeText(this, if (recording) "Recording stopped" else "Recording started", Toast.LENGTH_SHORT).show()
            }
        }

        findViewById<ImageButton>(R.id.btnHd).setOnClickListener { viewModel.setQuality(StreamQuality.HD) }
        findViewById<ImageButton>(R.id.btnSd).setOnClickListener { viewModel.setQuality(StreamQuality.SD) }

        findViewById<ImageButton>(R.id.btnPanLeft).setOnClickListener { viewModel.sendPtz(PtzCommand.PAN_LEFT) }
        findViewById<ImageButton>(R.id.btnPanRight).setOnClickListener { viewModel.sendPtz(PtzCommand.PAN_RIGHT) }
        findViewById<ImageButton>(R.id.btnTiltUp).setOnClickListener { viewModel.sendPtz(PtzCommand.TILT_UP) }
        findViewById<ImageButton>(R.id.btnTiltDown).setOnClickListener { viewModel.sendPtz(PtzCommand.TILT_DOWN) }
        findViewById<ImageButton>(R.id.btnZoomIn).setOnClickListener { viewModel.sendPtz(PtzCommand.ZOOM_IN) }
        findViewById<ImageButton>(R.id.btnZoomOut).setOnClickListener { viewModel.sendPtz(PtzCommand.ZOOM_OUT) }

        val motionToggle = findViewById<Switch>(R.id.switchMotionDetection)
        val sensitivitySeek = findViewById<SeekBar>(R.id.seekMotionSensitivity)
        motionToggle.setOnCheckedChangeListener { _, enabled ->
            viewModel.updateMotionSettings(enabled, sensitivitySeek.progress)
            motionIcon.visibility = if (enabled) View.VISIBLE else View.GONE
            if (enabled) {
                notificationHelper.showMotionDetected(pondId)
            }
        }
        sensitivitySeek.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                val enabled = motionToggle.isChecked
                viewModel.updateMotionSettings(enabled, progress)
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) = Unit
            override fun onStopTrackingTouch(seekBar: SeekBar?) = Unit
        })
    }

    private fun observeState(notificationHelper: CameraNotificationHelper) {
        viewModel.cameraConfig.observe(this) { config ->
            config ?: return@observe
            findViewById<Switch>(R.id.switchMotionDetection).isChecked = config.motionDetectionEnabled
            findViewById<SeekBar>(R.id.seekMotionSensitivity).progress = config.motionSensitivity
            motionIcon.visibility = if (config.motionDetectionEnabled) View.VISIBLE else View.GONE
            playStream()
        }

        viewModel.streamQuality.observe(this) {
            viewModel.cameraConfig.value?.let {
                playStream()
            }
        }

        viewModel.connectionStatus.observe(this) { status ->
            statusText.text = status
            val color = if (status == "Online") android.R.color.holo_green_light else android.R.color.holo_red_light
            statusDot.setBackgroundColor(getColor(color))
            if (status == "Offline" && !offlineNotified) {
                notificationHelper.showCameraOffline(pondId)
                offlineNotified = true
            }
            if (status == "Online") offlineNotified = false
        }
    }

    private fun playStream() {
        player?.release()

        val config = viewModel.cameraConfig.value ?: return
        val quality = viewModel.streamQuality.value ?: StreamQuality.HD
        val rtspUri = CameraRepository(applicationContext).buildRtspUri(config, quality)

        player = ExoPlayer.Builder(this).build().also { exoPlayer ->
            playerView.player = exoPlayer
            exoPlayer.setMediaItem(MediaItem.fromUri(rtspUri))
            exoPlayer.prepare()
            exoPlayer.playWhenReady = true
            exoPlayer.addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    when (playbackState) {
                        Player.STATE_BUFFERING -> viewModel.updateConnectionStatus("Connecting")
                        Player.STATE_READY -> viewModel.updateConnectionStatus("Online")
                        Player.STATE_IDLE,
                        Player.STATE_ENDED -> viewModel.updateConnectionStatus("Offline")
                    }
                }

                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    viewModel.updateConnectionStatus("Offline")
                }
            })
        }
    }

    private fun capturePlayerView(view: View): Bitmap? {
        if (view.width <= 0 || view.height <= 0) return null
        return Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888).apply {
            val canvas = Canvas(this)
            view.draw(canvas)
        }
    }

    private fun saveBitmapToGallery(bitmap: Bitmap) {
        val resolver = contentResolver
        val fileName = "cam_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}.jpg"
        val contentValues = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/AquaPond")
            }
        }
        val imageUri: Uri? = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
        imageUri?.let {
            val stream: OutputStream? = resolver.openOutputStream(it)
            stream.use { output ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, output)
            }
        }
    }

    override fun onStop() {
        super.onStop()
        player?.pause()
    }

    override fun onDestroy() {
        super.onDestroy()
        player?.release()
        player = null
    }

    fun launchCameraSettings(view: View) {
        startActivity(CameraSettingsActivity.newIntent(this, pondId))
    }

    fun launchPlayback(view: View) {
        startActivity(CameraPlaybackActivity.newIntent(this, pondId))
    }
}

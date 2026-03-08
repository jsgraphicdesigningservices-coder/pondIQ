package com.aquasmartpond.camera.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.ImageButton
import android.widget.SeekBar
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.aquasmartpond.R
import com.aquasmartpond.camera.data.CameraRepository
import java.io.File

class CameraPlaybackActivity : AppCompatActivity() {
    companion object {
        private const val EXTRA_POND_ID = "extra_pond_id"
        fun newIntent(context: Context, pondId: String) =
            Intent(context, CameraPlaybackActivity::class.java).putExtra(EXTRA_POND_ID, pondId)
    }

    private val viewModel: CameraViewModel by viewModels {
        CameraViewModelFactory(CameraRepository(applicationContext))
    }

    private var player: ExoPlayer? = null
    private lateinit var seekBar: SeekBar
    private val handler = Handler(Looper.getMainLooper())
    private val updateSeekRunnable = object : Runnable {
        override fun run() {
            val duration = player?.duration ?: 0L
            val current = player?.currentPosition ?: 0L
            if (duration > 0) {
                seekBar.max = duration.toInt()
                seekBar.progress = current.toInt()
            }
            handler.postDelayed(this, 500)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera_playback)

        val pondId = intent.getStringExtra(EXTRA_POND_ID).orEmpty()
        if (pondId.isBlank()) {
            finish()
            return
        }

        val playerView = findViewById<PlayerView>(R.id.playbackPlayerView)
        seekBar = findViewById(R.id.playbackSeekBar)
        val recordingList = findViewById<RecyclerView>(R.id.recordingRecyclerView)
        val playPauseBtn = findViewById<ImageButton>(R.id.btnPlaybackPlayPause)

        player = ExoPlayer.Builder(this).build().also {
            playerView.player = it
        }

        viewModel.loadCamera(pondId)
        val recordings = viewModel.recordingsForPond()
        val adapter = CameraRecordingAdapter(recordings) { file -> playFile(file) }

        recordingList.layoutManager = LinearLayoutManager(this)
        recordingList.adapter = adapter

        playPauseBtn.setOnClickListener {
            player?.let { p -> p.playWhenReady = !p.playWhenReady }
        }

        seekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) player?.seekTo(progress.toLong())
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) = Unit
            override fun onStopTrackingTouch(seekBar: SeekBar?) = Unit
        })

        handler.post(updateSeekRunnable)
    }

    private fun playFile(file: File) {
        val p = player ?: return
        p.setMediaItem(MediaItem.fromUri(file.toURI().toString()))
        p.prepare()
        p.playWhenReady = true
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(updateSeekRunnable)
        player?.release()
        player = null
    }
}

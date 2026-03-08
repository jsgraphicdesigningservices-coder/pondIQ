package com.aquasmartpond.camera.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import app.lovable.a125a195a138f46b096ee87bfcc54d251.R
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CameraRecordingAdapter(
    private val items: List<File>,
    private val onClick: (File) -> Unit
) : RecyclerView.Adapter<CameraRecordingAdapter.RecordingViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecordingViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_camera_recording, parent, false)
        return RecordingViewHolder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: RecordingViewHolder, position: Int) {
        holder.bind(items[position])
    }

    inner class RecordingViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val title = itemView.findViewById<TextView>(R.id.recordingTitle)
        private val subtitle = itemView.findViewById<TextView>(R.id.recordingSubtitle)

        fun bind(file: File) {
            title.text = file.name
            subtitle.text = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
                .format(Date(file.lastModified()))
            itemView.setOnClickListener { onClick(file) }
        }
    }
}

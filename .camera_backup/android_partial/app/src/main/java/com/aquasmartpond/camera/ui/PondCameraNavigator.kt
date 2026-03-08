package com.aquasmartpond.camera.ui

import android.app.Activity
import android.view.View

object PondCameraNavigator {
    fun attachLiveCameraButton(activity: Activity, button: View, pondId: String) {
        button.setOnClickListener {
            activity.startActivity(CameraLiveActivity.newIntent(activity, pondId))
        }
    }
}

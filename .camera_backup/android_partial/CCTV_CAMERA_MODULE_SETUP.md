# CCTV Camera Module Integration (Android)

This module is isolated and does not change your existing React/TypeScript app files.

## 1) Prerequisite

If your project does not yet have an Android platform:

```bash
npx cap add android
```

Then keep this folder structure inside your generated Android app module:

- `android/app/src/main/java/com/aquasmartpond/camera/...`
- `android/app/src/main/res/layout/...`

If your app package is not `com.aquasmartpond`, move the files under your actual package path and update the first line (`package ...`) in each Kotlin file.

## 2) Add Gradle dependencies

Copy dependencies from:

- `android/camera-module-snippets/app-build.gradle.kts.snippet`

into:

- `android/app/build.gradle.kts`

## 3) Register permissions and activities

Merge entries from:

- `android/camera-module-snippets/AndroidManifest.snippet.xml`

into:

- `android/app/src/main/AndroidManifest.xml`

## 4) Files added by this module

Kotlin:

- `android/app/src/main/java/com/aquasmartpond/camera/model/CameraConfig.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/data/CameraRepository.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/ui/CameraViewModel.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/ui/CameraViewModelFactory.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/ui/CameraLiveActivity.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/ui/CameraSettingsActivity.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/ui/CameraPlaybackActivity.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/ui/CameraRecordingAdapter.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/ui/PondCameraNavigator.kt`
- `android/app/src/main/java/com/aquasmartpond/camera/util/CameraNotificationHelper.kt`

Layouts:

- `android/app/src/main/res/layout/activity_camera_live.xml`
- `android/app/src/main/res/layout/activity_camera_settings.xml`
- `android/app/src/main/res/layout/activity_camera_playback.xml`
- `android/app/src/main/res/layout/item_camera_recording.xml`

## 5) Add “Live Camera” button in Pond Details screen

In your Pond Details layout XML, add button:

```xml
<Button
    android:id="@+id/btnLiveCamera"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Live Camera" />
```

In your Pond Details Activity/Fragment:

```kotlin
val liveCameraButton = findViewById<Button>(R.id.btnLiveCamera)
PondCameraNavigator.attachLiveCameraButton(this, liveCameraButton, pondId)
```

## 6) Camera assignment rule

One camera per pond is enforced by saved key pattern:

- `camera_<pondId>` in SharedPreferences.

## 7) Notes

- RTSP playback is provided by ExoPlayer (Media3).
- Recording is saved locally under app external files: `Movies/AquaPondRecordings/<pondId>/`.
- PTZ command transport is scaffolded in `CameraRepository.sendPtzCommand(...)`; map this to your camera vendor’s ONVIF/HTTP API.
- Motion alert notifications are wired through `CameraNotificationHelper` and can be triggered from real camera events/webhooks later.

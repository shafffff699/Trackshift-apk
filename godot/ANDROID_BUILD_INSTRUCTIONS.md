# Native Android APK Build & Export Guide (`com.trackshift.neonrun`)

This directory (`/godot/`) contains the complete Godot 4.3 source project for **TRACKSHIFT: NEON RUN** configured for native Android (`arm64-v8a`, Portrait orientation, offline `user://` persistence).

> **Environment Note**: The cloud container environment runs a Node.js/Linux container without the Godot 4 binary or the Android NDK/SDK build-tools installed, so a compiled `.apk` binary cannot be generated directly inside this container. Follow the exact 3-step command sequence below on your workstation or CI runner with Godot 4.3 and the Android SDK installed to produce the signed `TrackshiftNeonRun.apk`.

## 1. Prerequisites

1. **Godot Engine 4.3+** (Standard build) with **Godot 4.3 Export Templates** installed.
2. **OpenJDK 17** and **Android SDK** (Platform-Tools, Build-Tools `34.0.0`, Platform `android-34`, NDK `25.2.9519653`).
3. A debug or release keystore (Godot automatically generates a debug keystore, or you can create one with `keytool`):
   ```bash
   keytool -keyalg RSA -genkeypair -alias androiddebugkey \
     -keypass android -keystore debug.keystore -storepass android \
     -dname "CN=Android Debug,O=Android,C=US" -validity 9999 -deststoretype pkcs12
   ```

## 2. Exporting the Signed `.apk` via Command Line

From the repository root, run:

```bash
mkdir -p godot/build
godot --headless --path godot --export-debug "Android" build/TrackshiftNeonRun.apk
```

For a release-signed APK:

```bash
godot --headless --path godot --export-release "Android" build/TrackshiftNeonRun-release.apk
```

## 3. Installing onto Your Android Phone (`adb`)

Connect your Android device (such as the Lava Blaze Curve 5G) with USB Debugging enabled and run:

```bash
adb install -r godot/build/TrackshiftNeonRun.apk
```

Once installed, tap **TRACKSHIFT: NEON RUN** on your Android home screen to launch the game directly with full offline support.

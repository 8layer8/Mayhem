# Mayhem for Android TV

Installable Android TV shell for the Mayhem web app. The APK loads your self-hosted Mayhem server in a full-screen WebView with D-pad and media-key support.

## Prerequisites

- **JDK 17** (Temurin or Android Studio bundled JDK). Java 21 works; **Java 26 is not supported yet** by the Kotlin/Gradle toolchain and will fail with an error like `IllegalArgumentException: 26.0.1`.
- **Android SDK** (API 35). Easiest path: install [Android Studio](https://developer.android.com/studio) and open this folder — it provides JDK 17 and the SDK.
- A running Mayhem server reachable from your TV (LAN or public URL)
- Recommended server env: `UI_SCALE=extra-large` or `UI_SCALE=full`

Set `JAVA_HOME` to JDK 17 before building from the CLI, for example:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS default; install via Android Studio
```

If you only have Java 26 installed, `./build.sh` downloads a portable JDK 17 automatically (~180 MB, cached under `~/.cache/mayhem-android/`).

## Build

From the command line, use **`build.sh`** (not `./gradlew` directly). It selects JDK 17/21 automatically and downloads a portable JDK 17 on first run if needed — required because **Java 26 breaks Gradle/Kotlin**.

```bash
cd android-tv
./build.sh assembleDebug
```

Or open this folder in **Android Studio** (it bundles JDK 17).

If you prefer `./gradlew` directly, set JDK 17 first:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
./gradlew assembleDebug
```

The debug APK is at `app/build/outputs/apk/debug/app-debug.apk`.

## Install on Android TV

```bash
adb connect YOUR_TV_IP
adb install app/build/outputs/apk/debug/app-debug.apk
```

Or sideload the APK with a file manager / Downloader app on the TV.

## First launch

1. Open **Mayhem** from the Android TV home screen.
2. Enter your Mayhem server URL (e.g. `https://mayhem.example.com` or `http://192.168.1.50:8080`).
3. Sign in with Plex when prompted.
4. Browse and play with the remote.

Press **Menu** on the remote to change the server URL.

## How it works

- The WebView app adds `MayhemAndroidTV/1.0` to the user agent and sets `data-tv="true"` on the page.
- The React client detects TV mode and shows a horizontal top nav, larger UI, playlist shortcuts, and media-key handlers.
- Plex tokens remain on your Mayhem server — the APK is just a browser shell.

## Cleartext HTTP

`android:usesCleartextTraffic="true"` is enabled so local HTTP servers work during development. For production, use HTTPS and set `COOKIE_SECURE=true` on the server.

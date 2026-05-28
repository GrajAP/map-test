# Build and install the Android APK

This project is an Expo SDK 56 app with a checked-in Android project. Use this flow when you want the app installed on your Android phone without an Expo dev server.

References:

- Expo SDK 56 reference: https://docs.expo.dev/versions/v56.0.0/
- Expo APK guide: https://docs.expo.dev/build-reference/apk/
- Expo Android build process: https://docs.expo.dev/build-reference/android-builds/

## Prerequisites

1. Install Node 22.13 or newer. Expo SDK 56 lists Node 22.13.x as the minimum.
2. Install the Android SDK/platform tools so `adb` is available.
3. Enable Developer options and USB debugging on the phone.
4. Connect the phone by USB and accept the debugging prompt.
5. From the repo root, install dependencies if needed:

```sh
npm install
```

## Check the phone connection

```sh
adb devices -l
```

You should see your phone listed as `device`, not `unauthorized`.

## One-command build and install

From the repo root:

```sh
npm run apk:install
```

The script builds the release APK, installs it on the single connected Android device, and launches the app. If more than one device is connected, set `ANDROID_SERIAL` first:

```sh
ANDROID_SERIAL=your_device_id npm run apk:install
```

## Docker build and install

On Debian, Pop!_OS, or any other Linux distro with Docker:

```sh
docker compose build app
./scripts/docker-apk-install.sh
```

The Docker image contains Node, Bun, JDK 17, Android SDK 36, build-tools 35/36, NDK 27.1.12297006, and CMake 3.22.1. The script clears Android build caches that contain absolute host paths, installs JS dependencies from `bun.lock`, runs Expo prebuild, builds the APK, installs it with `adb`, and launches the app.

If the phone is not visible, check:

```sh
docker compose run --rm --user root app adb devices -l
```

## Build a release APK locally

From the repo root:

```sh
cd android
./gradlew assembleRelease
cd ..
```

The APK will be created at:

```text
android/app/build/outputs/apk/release/app-release.apk
```

This build embeds the JavaScript bundle, so the installed app does not need `npx expo start` or a Metro server.

## Install the APK on the connected phone

```sh
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Launch it from the phone, or from the terminal:

```sh
adb shell monkey -p com.grajpap.maptest -c android.intent.category.LAUNCHER 1
```

## Useful checks

Run these before building when you changed TypeScript or Expo config:

```sh
npx tsc --noEmit
npm run lint
npx expo-doctor
```

## Alternative: EAS APK build

If you want Expo to build the APK in the cloud, add an `eas.json` build profile like:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Then run:

```sh
eas build -p android --profile preview
```

After it finishes, download the APK URL from EAS and install it with `adb install path/to/app.apk`, or open the URL on the phone and install it there.

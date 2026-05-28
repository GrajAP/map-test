#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
PACKAGE_NAME="com.grajpap.maptest"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb was not found. Install Android platform-tools and put adb on PATH." >&2
  exit 1
fi

DEVICE_COUNT="$(adb devices | awk 'NR > 1 && $2 == "device" { count++ } END { print count + 0 }')"

if [ "$DEVICE_COUNT" -eq 0 ]; then
  echo "No authorized Android device found. Connect the phone, unlock it, and accept USB debugging." >&2
  adb devices -l
  exit 1
fi

if [ "$DEVICE_COUNT" -gt 1 ] && [ -z "${ANDROID_SERIAL:-}" ]; then
  echo "More than one Android device is connected. Set ANDROID_SERIAL to choose one." >&2
  adb devices -l
  exit 1
fi

echo "Regenerating Android native project with Expo prebuild..."
(cd "$ROOT_DIR" && npx expo prebuild --platform android --no-install)

if [ -n "${ANDROID_HOME:-}" ]; then
  printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$ROOT_DIR/android/local.properties"
fi

echo "Building release APK..."
(cd "$ROOT_DIR/android" && ./gradlew assembleRelease)

echo "Installing $APK_PATH..."
adb install -r "$APK_PATH"

echo "Launching $PACKAGE_NAME..."
adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null

echo "Done."

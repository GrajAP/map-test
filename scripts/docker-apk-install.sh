#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

HOST_UID="$(id -u)" HOST_GID="$(id -g)" docker compose run --rm app bash -lc '
  set -euo pipefail

  rm -rf \
    android/.gradle \
    android/build \
    android/app/build \
    android/app/.cxx \
    android/app/.externalNativeBuild

  bun install --frozen-lockfile
  npx expo prebuild --platform android --no-install
  printf "sdk.dir=%s\n" "$ANDROID_HOME" > android/local.properties
  cd android
  ./gradlew --no-daemon --max-workers=2 assembleRelease
'

docker compose run --rm --user root app bash -lc '
  set -euo pipefail

  apk_path=/workspace/android/app/build/outputs/apk/release/app-release.apk
  package_name=com.grajpap.maptest

  device_count="$(adb devices | awk '\''NR > 1 && $2 == "device" { count++ } END { print count + 0 }'\'')"

  if [ "$device_count" -eq 0 ]; then
    echo "No authorized Android device found. Connect the phone, unlock it, and accept USB debugging." >&2
    adb devices -l
    exit 1
  fi

  if [ "$device_count" -gt 1 ] && [ -z "${ANDROID_SERIAL:-}" ]; then
    echo "More than one Android device is connected. Set ANDROID_SERIAL to choose one." >&2
    adb devices -l
    exit 1
  fi

  echo "Installing $apk_path..."
  adb install -r "$apk_path"

  echo "Launching $package_name..."
  adb shell monkey -p "$package_name" -c android.intent.category.LAUNCHER 1 >/dev/null

  echo "Done."
'

# Map Test

Small React Native map app built in Expo for collecting geotagged spots on mobile.

## What it currently does
- Show interactive map view using **MapLibre** with swappable tile providers and style editor
- Add a spot by long-pressing on map
- Attach title/description/color/icon and optional photo to each pin
- Edit existing pins and remove selected ones
- Show current user location and recenter on demand
- Keep map state (pins, style, provider) in local app state for fast usage

## Tech stack
- React Native + Expo Router (TypeScript)
- MapLibre + Expo Location + Expo ImagePicker
- `bun` for package workflow and scripts

## Run the project (dev)
```bash
npm install   # or bun install
bun run start

# Android build + install (if device is connected by USB)
bun run apk:install
```

## Prerequisites for APK install
- Android device connected over USB with USB debugging enabled
- Java installed
- Android SDK/ADB available in PATH

## Notes
This is a practical playground project for mobile product thinking: state, gestures, permissions and map UX in one place.

{
  description = "Declarative development shell for the map-test Expo app";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config = {
              allowUnfree = true;
              android_sdk.accept_license = true;
            };
          };

          androidComposition = pkgs.androidenv.composeAndroidPackages {
            platformVersions = [ "36" ];
            buildToolsVersions = [
              "36.0.0"
              "35.0.0"
            ];
            includeCmake = true;
            cmakeVersions = [ "3.22.1" ];
            includeNDK = true;
            ndkVersions = [ "27.1.12297006" ];
            includeEmulator = true;
            includeSystemImages = true;
            systemImageTypes = [ "google_apis" ];
            abiVersions = [ "x86_64" "arm64-v8a" ];
          };

          androidSdk = androidComposition.androidsdk;
          jdk = pkgs.jdk17;
        in
        {
          default = pkgs.mkShell {
            name = "map-test-dev";

            packages = with pkgs; [
              androidSdk
              bash
              bun
              git
              jdk
              nodejs_22
              unzip
              watchman
              zip
            ];

            ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
            ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
            JAVA_HOME = "${jdk.home}";

            GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${androidSdk}/libexec/android-sdk/build-tools/36.0.0/aapt2";

            shellHook = ''
              export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH:$PWD/node_modules/.bin"
              export REACT_NATIVE_PACKAGER_HOSTNAME=''${REACT_NATIVE_PACKAGER_HOSTNAME:-127.0.0.1}

              mkdir -p android
              printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties

              cat <<EOF
map-test dev shell
  node:    $(${pkgs.nodejs_22}/bin/node --version)
  bun:     $(${pkgs.bun}/bin/bun --version)
  java:    $(java -version 2>&1 | head -n 1)
  android: $ANDROID_HOME
  gradle:  ./android/gradlew (pinned by android/gradle/wrapper/gradle-wrapper.properties)
EOF
            '';
          };
        });
    };
}

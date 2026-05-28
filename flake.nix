{
  description = "Flake for map-test Expo React Native app";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: 
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { 
        inherit system;
        config.allowUnfree = true;
      };
    in 
    {
      devShells.default = pkgs.mkShell {
        name = "map-test-dev";
        packages = [
          pkgs.nodejs-18_x
          pkgs.bun
          pkgs.watchman
          pkgs.jdk11 # Expo SDK 56 requires Java 11 for Android
          # Android SDK platform tools (adb, etc.) - optional but useful
          pkgs.android-sdk-platform-tools
          # Expo CLI globally installed via bun (we'll install in shellHook)
        ];
        shellHook = ''
          # Install expo-cli globally with bun if not already installed
          if ! bun expo --version &>/dev/null; then
            bun add -g expo-cli
          fi
          # Ensure we use the local bun install for project dependencies
          export PATH="./node_modules/.bin:$PATH"
        '';
      };
    };
}
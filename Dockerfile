FROM ubuntu:24.04

ARG TARGETARCH
ARG NODE_VERSION=22.22.3
ARG BUN_VERSION=1.3.13
ARG ANDROID_CMDLINE_TOOLS_VERSION=14742923

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV JAVA_HOME=/opt/java
ENV PATH=/opt/bun/bin:/opt/node/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/emulator:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    file \
    g++ \
    git \
    libc6 \
    libstdc++6 \
    make \
    openjdk-17-jdk-headless \
    python3 \
    unzip \
    watchman \
    xz-utils \
    zip \
  && ln -s /usr/lib/jvm/java-17-openjdk-* /opt/java \
  && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
  case "${TARGETARCH:-amd64}" in \
    amd64) node_arch="x64"; bun_arch="x64" ;; \
    arm64) node_arch="arm64"; bun_arch="aarch64" ;; \
    *) echo "Unsupported Docker architecture: ${TARGETARCH}" >&2; exit 1 ;; \
  esac; \
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" -o /tmp/node.tar.xz; \
  mkdir -p /opt/node; \
  tar -xJf /tmp/node.tar.xz -C /opt/node --strip-components=1; \
  rm /tmp/node.tar.xz; \
  curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${bun_arch}.zip" -o /tmp/bun.zip; \
  unzip -q /tmp/bun.zip -d /tmp/bun; \
  mkdir -p /opt/bun/bin; \
  mv "/tmp/bun/bun-linux-${bun_arch}/bun" /opt/bun/bin/bun; \
  chmod +x /opt/bun/bin/bun; \
  ln -s /opt/bun/bin/bun /opt/bun/bin/bunx; \
  rm -rf /tmp/bun /tmp/bun.zip

RUN set -eux; \
  mkdir -p "${ANDROID_HOME}/cmdline-tools"; \
  curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip" -o /tmp/android-commandlinetools.zip; \
  unzip -q /tmp/android-commandlinetools.zip -d "${ANDROID_HOME}/cmdline-tools"; \
  mv "${ANDROID_HOME}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest"; \
  rm /tmp/android-commandlinetools.zip; \
  yes | sdkmanager --licenses >/dev/null || true; \
  sdkmanager \
    "platform-tools" \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "build-tools;35.0.0" \
    "ndk;27.1.12297006" \
    "cmake;3.22.1"; \
  yes | sdkmanager --licenses >/dev/null || true

WORKDIR /workspace

CMD ["bash"]

#!/usr/bin/env bash
# Build wrapper: Gradle/Kotlin 8.x cannot run on Java 26. Uses JDK 17/21.
set -euo pipefail
cd "$(dirname "$0")"

CACHE_DIR="${MAYHEM_ANDROID_JDK_CACHE:-$HOME/.cache/mayhem-android}"
JDK17_DIR="$CACHE_DIR/jdk17"

java_major_version() {
  "$1/bin/java" -version 2>&1 | head -1 | sed -E 's/.* version "([0-9]+).*/\1/'
}

is_supported_java() {
  local major
  major=$(java_major_version "$1")
  [[ "$major" =~ ^[0-9]+$ ]] || return 1
  [ "$major" -ge 17 ] && [ "$major" -le 21 ]
}

# Drop a pre-set JAVA_HOME if it points at Java 22+ (e.g. system Java 26).
if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ] && ! is_supported_java "$JAVA_HOME"; then
  echo "Ignoring unsupported JAVA_HOME ($("$JAVA_HOME/bin/java" -version 2>&1 | head -1))"
  unset JAVA_HOME
fi

install_portable_jdk17() {
  local arch os asset tmp
  case "$(uname -m)" in
    arm64|aarch64) arch="aarch64" ;;
    x86_64|amd64) arch="x86_64" ;;
    *) echo "Unsupported CPU architecture: $(uname -m)" >&2; return 1 ;;
  esac
  case "$(uname -s)" in
    Darwin) os="mac" ;;
    Linux) os="linux" ;;
    *) echo "Unsupported OS: $(uname -s)" >&2; return 1 ;;
  esac

  echo "Downloading portable JDK 17 to $JDK17_DIR ..."
  mkdir -p "$CACHE_DIR"
  tmp=$(mktemp -d)
  asset="OpenJDK17U-jdk_${arch}_${os}_hotspot_17.0.13_11.tar.gz"
  curl -fsSL \
    "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%2B11/${asset}" \
    -o "$tmp/jdk17.tar.gz"
  rm -rf "$JDK17_DIR"
  mkdir -p "$tmp/extract"
  tar -xzf "$tmp/jdk17.tar.gz" -C "$tmp/extract"
  if [ "$os" = "mac" ]; then
    home_dir=$(find "$tmp/extract" -type d -path '*/Contents/Home' | head -1)
    if [ -z "$home_dir" ]; then
      echo "Could not locate JDK Home in macOS archive" >&2
      rm -rf "$tmp"
      return 1
    fi
    mv "$home_dir" "$JDK17_DIR"
  else
    home_dir=$(find "$tmp/extract" -maxdepth 1 -mindepth 1 -type d | head -1)
    mv "$home_dir" "$JDK17_DIR"
  fi
  rm -rf "$tmp"
}

find_supported_jdk() {
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ] && is_supported_java "$JAVA_HOME"; then
    return 0
  fi

  if command -v /usr/libexec/java_home >/dev/null 2>&1; then
    for v in 21 17; do
      if /usr/libexec/java_home -v "$v" >/dev/null 2>&1; then
        local candidate
        candidate=$(/usr/libexec/java_home -v "$v")
        if [ -x "$candidate/bin/java" ] && is_supported_java "$candidate"; then
          export JAVA_HOME="$candidate"
          return 0
        fi
      fi
    done
  fi

  for dir in \
    "$JDK17_DIR" \
    "/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home" \
    "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home" \
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"; do
    if [ -x "$dir/bin/java" ] && is_supported_java "$dir"; then
      export JAVA_HOME="$dir"
      return 0
    fi
  done

  if [ ! -x "$JDK17_DIR/bin/java" ]; then
    install_portable_jdk17
  fi
  if [ -x "$JDK17_DIR/bin/java" ] && is_supported_java "$JDK17_DIR"; then
    export JAVA_HOME="$JDK17_DIR"
    return 0
  fi

  return 1
}

if ! find_supported_jdk; then
  echo "ERROR: Could not find or install JDK 17/21." >&2
  echo "Install manually: brew install --cask temurin@17" >&2
  exit 1
fi

echo "Using JAVA_HOME=$JAVA_HOME ($("$JAVA_HOME/bin/java" -version 2>&1 | head -1))"

if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

if [ -n "${ANDROID_HOME:-}" ] && [ ! -f local.properties ]; then
  printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
fi

if [ ! -f local.properties ] && [ -z "${ANDROID_HOME:-}" ]; then
  echo "ERROR: Android SDK not found." >&2
  echo "Install Android Studio, or set ANDROID_HOME to your SDK path." >&2
  echo "Example: export ANDROID_HOME=\$HOME/Library/Android/sdk" >&2
  exit 1
fi

exec ./gradlew "$@"

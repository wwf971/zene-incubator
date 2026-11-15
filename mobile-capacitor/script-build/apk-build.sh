#!/bin/sh
# Builds the app of the doc page into an Android apk to install on a phone
# (doc-page/doc/zene-deploy-mobile-capacitor.md#building-the-apk): the web build (vite), its copy into
# the Android project (cap sync), the apk (gradle), copied out to build-apk/zene-<version>-debug.apk.
#
#   sh script-build/apk-build.sh            (npm run apk)
#
# Capacitor 8 needs JDK 21 (its gradle, 8.14, runs on 17 to 24 but the code is compiled for 21) and
# the Android SDK (platform 36): JAVA_HOME when it is a JDK 21, else where macOS, Homebrew's openjdk@21
# and Android Studio keep one; ANDROID_HOME, else where Android Studio puts the SDK.
set -e
here=$(cd "$(dirname "$0")/.." && pwd)
cd "$here"

java_major() { "$1/bin/java" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1; }
if [ -z "$JAVA_HOME" ] || [ "$(java_major "$JAVA_HOME")" != 21 ]; then
	JAVA_HOME=
	for home in "$(/usr/libexec/java_home -v 21 2>/dev/null || true)" /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home /usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home "/Applications/Android Studio.app/Contents/jbr/Contents/Home"; do
		if [ -n "$home" ] && [ -x "$home/bin/java" ] && [ "$(java_major "$home")" = 21 ]; then JAVA_HOME=$home; break; fi
	done
fi
if [ -z "$JAVA_HOME" ]; then echo "no JDK 21: install one (brew install openjdk@21) or set JAVA_HOME to one" >&2; exit 1; fi
export JAVA_HOME
echo "JDK: $JAVA_HOME"
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
if [ ! -d "$ANDROID_HOME/platforms" ]; then echo "no Android SDK at $ANDROID_HOME: set ANDROID_HOME" >&2; exit 1; fi

[ -d node_modules ] || npm install
npx vite build
npx cap sync android
(cd android && ./gradlew --console=plain assembleDebug)

version=$(node -p "require('./package.json').version")
mkdir -p build-apk
cp android/app/build/outputs/apk/debug/app-debug.apk "build-apk/zene-$version-debug.apk"
echo "the apk: $here/build-apk/zene-$version-debug.apk"

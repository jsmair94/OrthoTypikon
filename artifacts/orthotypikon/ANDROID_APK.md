# OrthoTypikon Android APK

The direct-install Android build is generated locally from the Expo project. It
does not use Expo Go, Metro, localhost, or a developer-domain URL at runtime.

## Build

From the repository root:

```bash
pnpm --filter @workspace/orthotypikon run build:apk
```

This performs a clean native prebuild by default. To resume an interrupted
Gradle build while reusing its generated Android/CMake outputs, set
`APK_PREBUILD_CLEAN=0`; use that only when `app.json` has not changed:

```bash
APK_PREBUILD_CLEAN=0 \
  pnpm --filter @workspace/orthotypikon run build:apk
```

Pause the running OrthoTypikon Expo preview before building. Native compilation
and Metro bundling need most of the workspace memory; the preview can be
restarted after the APK is ready.

The first run downloads the Android command-line tools and the Android 36
platform/build tools into `artifacts/orthotypikon/.android-sdk/`. Gradle caches
are kept in the ignored `artifacts/orthotypikon/.gradle-home/` directory so
they survive workspace restarts. The command then regenerates the ignored
`android/` project from `app.json`, runs Gradle, verifies the APK archive, and
writes:

```text
artifacts/orthotypikon/dist/OrthoTypikon-1.0.0-release.apk
artifacts/orthotypikon/dist/OrthoTypikon-1.0.0-release.apk.json
```

The constrained workspace build skips Gradle's dependency-wide
`lintVitalAnalyzeRelease` phase and caps Android's native Ninja compilation at
two jobs to avoid exhausting build memory. Run
`pnpm --filter @workspace/orthotypikon run typecheck` before packaging; native
source compilation and APK validation still run as part of the build.

The JSON sidecar records the file size, SHA-256 checksum, Android package, and
signing note. The APK can be downloaded from the generated workspace asset card
after a successful build.

## Live daily content and optional app API

On Android and iOS, the daily Verse and Occasion card fetches the current
Synaxarion page directly from Orthodox Jordan over HTTPS. This does not require
a Replit deployment, a developer URL, or an API domain in the APK. English,
Greek, and French text is translated by Google Translate; if translation is
unavailable, the source Arabic is shown. If the source site cannot be reached,
the app keeps its local fallback content.

Other app API features remain optional. To enable the community API in an
installed build, pass a reachable HTTPS hostname or URL:

```bash
EXPO_PUBLIC_DOMAIN=your-public-api.example \
  pnpm --filter @workspace/orthotypikon run build:apk
```

The build rejects `localhost`, loopback addresses, `0.0.0.0`, and
`*.replit.dev` so a developer-only endpoint cannot be embedded accidentally.
Do not put credentials in the command or in tracked files. The direct
Synaxarion fetch does not use this option.

React Native's generic error text contains a dormant `localhost:8081` Metro
example even in production bundles. The installed app does not use it: the
packaged Expo configuration contains no API domain unless the validated
`EXPO_PUBLIC_DOMAIN` option above is supplied.

## Requirements

- Java 17 or newer
- Gradle 8 or newer (the generated wrapper is used after prebuild)
- `curl`/Node fetch and `unzip` for the first SDK bootstrap
- Enough disk space for the Android SDK, Gradle cache, and generated native
  project
- 64-bit ARM Android device running Android 7.0/API 24 or newer

Install the APK with Android Debug Bridge when a device is connected:

```bash
adb install -r artifacts/orthotypikon/dist/OrthoTypikon-1.0.0-release.apk
```

## Signing and Play Store limitation

This is a directly installable release APK signed with the local/debug Android
keystore used by the generated native project. It is suitable for device or
emulator testing and hand-installation, but it is **not** a Play Store release.

A future Play Store release needs a protected upload keystore, a unique signing
setup, a production App Bundle (`.aab`), Play App Signing enrollment, store
metadata, and release-policy review. Those are intentionally outside this
task.

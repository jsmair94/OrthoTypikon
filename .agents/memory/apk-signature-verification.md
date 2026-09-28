---
name: APK signature verification
description: How to validate Android APK archives in this workspace.
---

Use Android's `apksigner verify --verbose` as the authority for whether a built APK is correctly signed. A generic ZIP validator such as `unzip -t` can report invalid extra-field warnings for a valid APK because of Android's APK Signing Block.

**Why:** A release APK built and signed in this workspace passed v2 signature verification while `unzip -t` emitted extra-field errors; treating those ZIP warnings as a failed build would reject a directly installable APK.

**How to apply:** When packaging Android APKs, confirm the archive header/size and verify the signature with the SDK's `apksigner`. Do not rely on generic ZIP integrity output alone.
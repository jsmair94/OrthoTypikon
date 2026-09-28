---
name: OrthoTypikon Android and web parity
description: Product convention for keeping Android and web behavior aligned.
---

Prefer shared Expo components and behavior for OrthoTypikon's Android app and web view. When a user-facing feature changes, update the shared path so both platforms receive it; rebuild the Android APK when shipping code changes that need to reach installed Android users. Add platform-specific behavior only when required by a native capability or explicitly requested.

**Why:** The user asked that every update be reflected on both Android and web, after a visual difference between those views caused confusion.

**How to apply:** For UI and behavior changes, first check whether the shared Expo screen/component is the source for both renderers. Avoid web-only patches; include Android verification/build steps when appropriate.
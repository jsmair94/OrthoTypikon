---
name: Radio embed compatibility
description: Compatibility constraints for the Orthodox radio station embed used by the live screen.
---

The supplied myTuner Orthodox station embed responds over HTTP, while its HTTPS hostname currently has a certificate mismatch in this environment. Native playback should use the original URL in a WebView, with an external-link fallback when embedding is blocked.

**Why:** Browsers and iOS may reject HTTP content or cross-origin iframe embedding even when the URL responds successfully, so a single web-only embed is not reliable across platforms.

**How to apply:** Keep the in-app player user-initiated, preserve the external fallback, and do not silently replace the station URL with the currently invalid HTTPS variant.
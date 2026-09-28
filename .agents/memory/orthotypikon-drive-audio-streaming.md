---
name: Google Drive audio streaming compatibility
description: Browser playback can fail for Google Drive URLs that appear to be valid, range-capable MP3 streams.
---

Do not treat a successful `curl` download, `audio/mpeg` content type, or byte-range response as proof that a Google Drive URL can be used by an HTML audio element. Verify the exact URL in a browser media element. When it fails with a media format error, use a host that serves a browser-playable inline audio stream or bundle the media after explaining the app-size cost.

**Why:** In this workspace, Chromium loaded a known-good MP3 from another host but rejected Google Drive's direct download, `export=media`, `export=view`, and final `drive.usercontent.google.com` URLs with a media format error. The downloaded sample itself decoded and had normal audio levels.

**How to apply:** For public Google Drive MP3 links, test browser playback in addition to HTTP headers and range requests. If the player shows “playing” but there is no sound, verify media loading rather than assuming the source file is silent.
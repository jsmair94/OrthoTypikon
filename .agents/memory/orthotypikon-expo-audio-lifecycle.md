---
name: Expo audio player lifecycle
description: Prevent cleanup code from calling a released shared audio player.
---

`useAudioPlayer` releases its shared player automatically on unmount and when its source dependencies change. Avoid an effect cleanup that calls `pause()` on that player: source replacement can release the old shared object before React runs the old effect cleanup.

**Why:** A provider cleanup attempted to pause an already released native player during a source change, producing a runtime exception.

**How to apply:** Set audio mode in an effect, use explicit pause/stop for user-driven behavior, and leave object release to the hook unless the library lifecycle has been verified independently.
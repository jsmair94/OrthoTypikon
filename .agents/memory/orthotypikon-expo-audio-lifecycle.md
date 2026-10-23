---
name: Expo audio player lifecycle
description: Prevent cleanup code from calling a released shared audio player.
---

`useAudioPlayer` releases its shared player automatically on unmount and when its source dependencies change. Avoid an effect cleanup that calls `pause()` on that player: source replacement can release the old shared object before React runs the old effect cleanup.

**Why:** A provider cleanup attempted to pause an already released native player during a source change, producing a runtime exception.

**How to apply:** Set audio mode in an effect, use explicit pause/stop for user-driven behavior, and leave object release to the hook unless the library lifecycle has been verified independently.

On web, the installed Expo Audio player calls `HTMLAudioElement.play()` but discards its promise. Pausing before playback has advanced can reject that promise with an interruption error. When switching away during startup, wait until playback progress advances before pausing; clear the deferred pause if the user switches back.

**Why:** Switching rosaries immediately after starting playback interrupted the browser's pending play request and produced an unhandled rejection.

**How to apply:** For web player changes, check whether playback has actually advanced before pausing. Recheck the installed Expo Audio implementation if its version changes.

All app-managed audio playback should use the single player owned by the root audio provider rather than creating route-local players.

**Why:** Route-local `useAudioPlayer` instances are released when their screen unmounts, stopping playback during navigation; separate players also allow prayers from different screens to overlap.

**How to apply:** Register Bible, rosary, daily reading, hymn, and other audio sources with the shared provider. Keep route controls bound to a stable content ID so route changes preserve playback, and use a different ID when the selected recording changes.
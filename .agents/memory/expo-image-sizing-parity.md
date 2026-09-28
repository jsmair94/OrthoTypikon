---
name: Cross-platform React Native image sizing
description: Prevent Android thumbnails from expanding cards beyond their web layout.
---

For React Native thumbnails inside flex-row cards, give the image frame an explicit height or aspect ratio before using percentage dimensions on the image. `minHeight` alone may not constrain Android's native image measurement; long text in the adjacent flex column should also have a minimum width of zero and a reasonable line cap.

**Why:** The same occasion card stayed compact on web but expanded almost to screen height on Android when a tall source image determined a frame that only had `minHeight`.

**How to apply:** When a card's native layout differs from web after image loading, check for percentage-height images inside min-height-only frames. Bound the frame and constrain flex text, then verify both renderers.
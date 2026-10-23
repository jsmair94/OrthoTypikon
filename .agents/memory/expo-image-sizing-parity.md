---
name: Cross-platform React Native image sizing
description: Prevent Android thumbnails from expanding cards beyond their web layout.
---

For React Native thumbnails inside flex-row cards, give the image frame an explicit height or aspect ratio before using percentage dimensions on the image. `minHeight` alone may not constrain Android's native image measurement; long text in the adjacent flex column should also have a minimum width of zero and a reasonable line cap.

**Why:** The same occasion card stayed compact on web but expanded almost to screen height on Android when a tall source image determined a frame that only had `minHeight`.

**How to apply:** When a card's native layout differs from web after image loading, check for percentage-height images inside min-height-only frames. Bound the frame and constrain flex text, then verify both renderers.

For every new user-supplied OrthoTypikon Explore image, use `stretch` so it fills the tile edge-to-edge with no empty bands and no cropping. This can distort the image's proportions.

**Why:** The user explicitly instructed that all future images they send for Explore sections should use the same fill treatment, without margins.

**How to apply:** Treat a user-supplied image and Explore label as a request to replace that tile's cover, and set that tile to `stretch`. Do not change other cards. Follow a later explicit request to preserve proportions or use another fit mode.
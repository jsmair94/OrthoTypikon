---
name: Local image fallback
description: Fallback for visual assets when public image search cannot be used in the current environment
---

When image search is unavailable, prefer the existing bundled artwork or another local asset over remote image URLs so mobile previews remain reliable offline.

**Why:** Public image search may be unavailable for the current workspace, while remote URLs would add runtime availability and licensing uncertainty.

**How to apply:** Reuse or extend local image assets for app cards and preserve the existing visual language; only use external images when the user explicitly provides or approves a source.
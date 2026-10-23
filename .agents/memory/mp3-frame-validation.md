---
name: MP3 frame validation
description: Pitfalls when parsing MPEG audio headers for bounded recording checks.
---

MPEG bitrate tables are layer-specific and should be indexed by the decoded Layer I, II, or III value. A plausible-looking shared or misordered table can assign the wrong frame length and reject healthy recordings.

**Why:** Header parsing depends on the bitrate table matching both MPEG version and layer; a standard MPEG-1 Layer III 128 kbps, 44.1 kHz header is a useful known frame-length check.

**How to apply:** When adding or changing MP3 validation, test standard headers from each supported layer/version and verify that computed lengths align with actual frame boundaries.

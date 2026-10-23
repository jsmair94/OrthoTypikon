---
name: Bible text and audio assets
description: Bible structure, numbered chapter files, and the requirement to keep media out of the app bundle.
---

Within each book folder, pair chapter assets by matching numeric basenames. In the Railway Matthew folder `الإنجيل/العهد الجديد/متى/`, text keys use `.txt` while audio keys use uppercase `.MP3`; object-key casing is significant.

**Why:** The user specified numbered text/audio pairs, and the uploaded bucket screenshot showed `1.txt` beside `1.MP3`; treating the audio extension as lowercase caused production lookups to fail.

**How to apply:** Match each chapter by its numbered basename and preserve the exact key casing when reading or signing the audio object.

Keep Bible text and audio in Railway object storage; the app should request chapter text and short-lived audio links from the API rather than bundle media.

**Why:** The user explicitly wants Railway-hosted assets so Bible audio does not increase the app size.

**How to apply:** Serve text and temporary signed audio URLs through the backend; do not copy source media into app assets or public frontend builds.

Signed audio links authorize `GET`, so a `HEAD` probe can return 403 even when playback is valid.

**Why:** The S3-compatible storage validated the generated audio link with a ranged `GET`; a `HEAD` check falsely appeared to show that every recording was inaccessible.

**How to apply:** Verify signed audio URLs with a small ranged `GET` (for example, bytes 0–0), not `HEAD`.

The Bible reader lives behind the first “Audio Gospel” card in the home screen's Explore rail. Show all 39 Old Testament books individually in canonical order, using Arabic names that match uploaded folders; show the 27 New Testament books individually and preserve Gospel excerpts with their matching Gospel books.

**Why:** The user replaced the four Old Testament group cards with the 39 uploaded book folders and previously requested individual New Testament entries and Gospel excerpts under their corresponding books.

**How to apply:** Keep both testaments as individual book lists and make each entry open the correct chapter count and reader route. Use the same book IDs for storage lookup, and retain existing excerpts beneath their matching Gospel. The Audio Gospel card remains first in Explore, not Library → Spiritual tools or Prayers.

Keep chapter selection in the Bible browse screen, then open a dedicated reading screen for the chosen chapter rather than inserting long-form text into the book list. Let readers move to adjacent chapters from within that reader.

**Why:** The user clarified on 2026-10-14 that the testament/book/chapter browse flow should stay as-is, while chapter reading and listening should have their own page; they also explicitly asked to move between chapters without returning to the home/list page.

**How to apply:** Pass the selected book and chapter to the reader route; provide in-page previous/next navigation that updates the current route rather than stacking pages, stop the old chapter recording when changing chapters, preserve shared playback when leaving the reader, and use uploaded chapter text/audio pairs when available.

Verse-following playback uses an optional WebVTT sidecar named with the chapter number (for example, `1.vtt`) beside the text and MP3. Require one complete, sequential cue per numbered chapter verse with non-overlapping timestamps; use the chapter's own verse text for display. Never estimate verse timings from recording duration or reading pace.

**Why:** Audio position alone cannot identify a verse without timing aligned to the exact recording, and estimated boundaries can highlight the wrong text.

**How to apply:** Upload one cue per verse using standard WebVTT timestamps aligned to the exact human recording and Bible text. The API only returns highlights when both the sidecar and sequential verse text validate; otherwise keep chapter audio and text available without highlighting.

The active verse should be highlighted inline behind its text, not with a surrounding card or box.

**Why:** The user provided a reference image on 2026-10-14 and explicitly rejected a box around the verse as the only tracking indicator.

**How to apply:** Keep the verse number visually separate and apply a readable theme-aware text background to the active verse itself; word-by-word tracking still requires word-level timestamps.

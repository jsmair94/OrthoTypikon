---
name: Daily content defaults
description: Keep generic seeded fallbacks distinct from date-specific Scripture readings.
---

The shared daily verse and reading values are generic defaults, not a reviewed, date-specific Scripture plan. Local calendar data can supply commemorations and fasting guidance, but it is not a source for Bible verse or reading assignments.

**Why:** Reusing a generic fallback keeps the daily API available, but it must not be mistaken for editorial readings. The project’s local calendar workbooks contain feast and saint entries rather than a date-addressable Scripture corpus.

**How to apply:** Seed missing daily rows with insert-only conflict handling so existing editorial content and publication states survive. Replace generic values only from a reviewed, date-addressable source or an editorial import.
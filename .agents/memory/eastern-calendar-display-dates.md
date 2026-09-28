---
name: Eastern calendar display dates
description: Keep home calendar cards and the visible Eastern calendar date aligned.
---

For calendar UI and home cards linked to the selected Eastern calendar date, use the displayed `YYYY-MM-DD` key directly when looking up Eastern calendar content. Do not apply the 13-day civil/Julian conversion to the displayed date.

**Why:** The user expects September 24 to show the content assigned to September 24 in the displayed Eastern calendar. Applying the civil-to-Julian offset caused the card and calendar to show September 11 instead.

**How to apply:** Make the home occasion card and calendar screen use the same displayed date key. Keep any civil-to-Julian conversion isolated to features whose semantics explicitly require finding the Julian date corresponding to a civil date, and verify that behavior separately.
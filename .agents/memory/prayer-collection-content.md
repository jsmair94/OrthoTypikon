---
name: Prayer collection content
description: Why OrthoTypikon prayer and Scripture collections currently ship as localized app data.
---

The Library's prayer collections are currently bundled in Arabic, English, and Greek, while the app has no backend catalog endpoint for general prayers or Scripture passages.

The separate community prayer-request feature is discontinued. Do not restore its app/API/admin workflow or database storage unless the user explicitly requests it.

The “الإنجيل المسموع” card is first in the home screen's Explore rail and opens the entire Bible reader. It is not duplicated in Library → Spiritual tools, Prayers, or Learn. Existing short Gospel excerpts are retained within the reader's Gospels section.

**Why:** A bundled catalog lets the new collections work offline without adding an unrelated content API or admin workflow. The user moved the Gospel reader card to the home screen's Explore section and clarified that the Library's Spiritual tools rail is a different section.

**Why:** The user explicitly requested removal of community prayer requests from the app and admin, including all stored records. Fixed devotional prayer texts are a distinct feature and remain in the bundled library.

**How to apply:** Keep the reader independent of its data source and keep card labels aligned across locales. Keep the Audio Gospel card first in the home screen's Explore rail without duplicating it elsewhere. Do not imply recorded playback exists until audio is provided. If the catalog grows or needs editorial updates without app releases, add a shared content service and preserve the locale contract.

**How to apply:** Treat “prayer requests” as the discontinued community-submission feature, not as devotional prayers, rosary content, or the prayer library.

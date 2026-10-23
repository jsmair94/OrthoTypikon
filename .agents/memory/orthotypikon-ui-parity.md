---
name: OrthoTypikon website and mobile UI separation
description: Product convention for a standalone, web-first website beside the mobile app.
---

Share OrthoTypikon content and domain behavior across platforms where practical, but give the public website its own web-first layout and navigation. Do not serve the Expo mobile interface as the website or stretch mobile screens across desktop. Keep mobile styling and navigation native to the app.

**Why:** The user clarified that the website should be a conventional standalone website, not look or behave like the mobile app.

**How to apply:** Build public web changes in the dedicated website artifact. Preserve equivalent content when useful, but choose web-appropriate information architecture and responsive layouts independently of the mobile app.

For destructive actions shared across web and native, use an app-owned confirmation dialog instead of a multi-button `Alert.alert`. Removing a locally saved record should proceed even if its scheduled notification cannot be cancelled; show a warning after deletion.

**Why:** A name-day reminder could be edited but not deleted reliably across platforms, and a notification cleanup failure should not strand the locally saved reminder.

**How to apply:** Use this for shared Expo screens that manage AsyncStorage-backed records and associated notifications.
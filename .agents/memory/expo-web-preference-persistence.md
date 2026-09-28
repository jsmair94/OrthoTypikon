---
name: Expo web preference persistence
description: Reliability rule for first-run preferences in the Expo web preview.
---

For first-run gates and other critical preferences, keep AsyncStorage as the native source and mirror the serialized value to a same-site cookie on web. If AsyncStorage is empty on web, restore from the cookie.

**Why:** In the Expo web preview, localStorage accepted the preference write but was empty after a full reload. The same-site cookie survived and restored the selected language and calendar reliably.

**How to apply:** Use this dual persistence only for small, non-sensitive settings whose absence would incorrectly re-open onboarding. Never place secrets or personal data in the cookie.
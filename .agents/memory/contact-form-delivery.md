---
name: Contact form delivery scope
description: The agreed scope for collecting and delivering OrthoTypikon contact requests.
---

The official support destination is info@orthotypikon.org. Mobile and website contact submissions are delivered through the connected Resend integration; the app does not retain them in its database. Send a confirmation only after support accepts the message; address it to the submitter without repeating the submitted content. If confirmation delivery fails after support accepts the message, tell the visitor not to resubmit.

**Why:** The user wants reassurance that contact messages reached support without repeating potentially sensitive content in another email.

**How to apply:** Keep the support recipient fixed server-side, use the visitor's address only for `Reply-To` and the confirmation destination, never log or persist message content, and keep privacy wording accurate if the provider or retention behavior changes.
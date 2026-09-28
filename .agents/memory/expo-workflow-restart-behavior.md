---
name: Expo workflow restart behavior
description: Managed Expo workflow restarts can fail at the platform layer without emitting a fresh application log.
---

Treat a managed Expo restart error that says the server unexpectedly disconnected, with no new workflow log and no listening process, as an environment/workflow failure first rather than a TypeScript or Metro failure.

**Why:** The app can pass typechecking while the workflow manager returns a disconnected-server error before the Expo process remains alive.

**How to apply:** Check getWorkflowStatus, recent workflow logs, and listening ports before editing application code. Avoid restart loops when no new log exists; report the verification boundary clearly.
---
name: pnpm package working directory
description: Resolve monorepo assets reliably when running a workspace package script.
---

When a workspace package is launched with `pnpm --filter ... run`, its script runs from that package's directory. Cross-package assets should be resolved from the compiled module location or another explicit monorepo root, not by assuming `process.cwd()` is the repository root.

**Why:** The managed API workflow starts from the API package directory, while a production launch can start from the repository root. A cwd-relative asset path can silently point to different locations.

**How to apply:** For services that read built assets from another workspace package, anchor paths to the deployed module or configure an explicit path, and verify the chosen path exists after the production build.
---
name: Railway remote branch merges
description: Preserve GitHub-only changes when publishing from a Replit workspace to Railway.
---

Railway services may deploy from a GitHub branch that has commits not present in the local Replit checkout. Build a commit from the latest remote branch and merge only the requested local changes into it; do not replace the remote tree with the workspace tree.

**Why:** Replacing the tree can silently remove newer production content that exists only on GitHub.

**How to apply:** Before publishing, check the configured Railway source branch and compare changed-file baselines. Preserve remote-only edits, then push one atomic commit to trigger the intended deployments.

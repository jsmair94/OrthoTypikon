---
name: Bootstrapping empty GitHub repositories
description: Avoid Git Database API errors when a repository has no initial commit.
---

For an empty GitHub repository, first create an initial commit through the Contents API; then use the Git Database API for blobs, trees, and refs.

**Why:** Git Database operations can fail with a conflict when the repository has no initial commit or branch ref to build on.

**How to apply:** Check whether the target branch exists before building a tree commit. If the repository is empty, create a small initial Contents API commit first, then continue with the full commit.
---
name: Expo workspace dependencies
description: How to add dependencies to the Expo artifact without accidentally targeting the pnpm workspace root.
---

The generic Node package installer targets the workspace root and does not accept pnpm filter tokens as package names. Add Expo-specific dependencies to the OrthoTypikon package with the package filter, then restart its managed workflow.

**Why:** Root-targeted installation is rejected by pnpm’s workspace-root safety check, while passing a filter as a package token is rejected by the installer.

**How to apply:** When a dependency belongs only to the mobile artifact, scope package installation to that artifact rather than adding it at the repository root.
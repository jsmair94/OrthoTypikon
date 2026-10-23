---
name: Railway pnpm lockfile pin
description: Keep Railway Railpack frozen installs compatible with a pnpm workspace lockfile.
---

For Railway Railpack deployments of a pnpm monorepo, pin the root `packageManager` field to the exact pnpm version used to generate and validate the lockfile. Without the pin, Railpack may select a different pnpm version and fail its frozen install with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`, even when the workspace override metadata matches under the local pnpm version.

**Why:** Railway's builder and the workspace selected different pnpm versions. Pinning the workspace version let Railpack complete the frozen install without weakening lockfile enforcement.

**How to apply:** Compare the root `packageManager` field with `pnpm --version`, validate with `pnpm install --lockfile-only --frozen-lockfile`, and keep Railpack's install frozen rather than disabling the frozen lockfile.

Railpack validates every workspace importer before running a filtered build. When syncing only selected app directories, keep every workspace manifest represented in the root lockfile in sync too; an older, unrelated package manifest can still fail the install.

**Why:** A deploy-target-only sync left the Expo manifest older than the workspace lockfile, so both Railway services failed before their app build commands ran.

**How to apply:** Before deploying any package from a pnpm monorepo, compare all workspace `package.json` files with the root lockfile and include changed manifests in the same GitHub sync.
---
name: Expo Android builds in constrained workspaces
description: Memory constraints that affect local Expo native Android packaging in this workspace.
---

Pause application workflows before a local Android release build, use one
Gradle worker, cap the Android SDK's Ninja runner at two native jobs, and build
only the device architecture needed for direct installation. Gradle's worker
limit does not constrain Ninja's own C/C++ parallelism. Keep `GRADLE_USER_HOME`
inside the ignored project workspace so wrapper distributions and dependency
caches survive workspace restarts. Since Metro's monorepo watch folders can
still include ignored files, exclude Gradle/SDK/native build output directories
from Metro's block list or a populated cache can exhaust Linux's file-watcher
limit. Dependency-wide release lint may need to run separately from APK
packaging. If D8 runs out of heap at the DEX merge step, a fresh compute restart
followed by an incremental retry with a larger Gradle heap can succeed.

**Why:** Expo native compilation, the Kotlin daemon, Ninja's C++ compiler
processes, Metro's file watcher, and API previews can exhaust workspace
resources without producing an app-source error. A 1 GB Gradle heap was
insufficient for D8, while increasing the heap without first restarting compute
caused the workspace to restart under combined JVM pressure.
Even a successful clean arm64 build can take close to an hour here: Metro's
production bundle and a fresh native dependency build both consume substantial
CPU while logs are quiet for long stretches.

**How to apply:** For direct-install APK work in this workspace, restart compute
if a prior build exhausted memory, stop the app/API/preview workflows, preserve
the low-concurrency arm64-only profile, and restore the needed workflows after
packaging. Keep the cache local for reuse, but exclude `.gradle-home`,
`.android-sdk`, `android`, and `dist` from Metro file watching. Treat DEX heap
failures, watcher-limit errors, and daemon disappearance as workspace-capacity
issues, not app-source errors. If a clean build appears stalled, check for active
Gradle, Metro, and compiler processes before interrupting it.

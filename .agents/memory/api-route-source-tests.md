---
name: API route source tests
description: Node 24 compatibility constraints when HTTP tests import TypeScript API route modules directly
---

Node's native TypeScript test runner does not resolve extensionless TypeScript imports used by the workspace's bundler-oriented module configuration. Strip-only mode also rejects TypeScript parameter properties; transform-types mode handles them. Keep any extension resolver limited to tests and isolate the route under test from unrelated API modules.

**Why:** Direct imports of the full content router pulled in unrelated database modules and directory imports, making a focused HTTP test fragile. A dedicated endpoint router and test-only resolver allow the real handler and Zod response validation to run without building or contacting services.

**How to apply:** For future HTTP tests of source routes, inject the network-facing service, mount the actual endpoint router in a local Express server, and use a test-only resolver plus `--experimental-transform-types` where Node's source loader cannot mirror the bundler.

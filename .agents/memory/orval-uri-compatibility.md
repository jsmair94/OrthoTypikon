---
name: Orval URI compatibility
description: Compatibility constraint between OpenAPI URI formats, Orval, and the workspace Zod version.
---

Keep URL-shaped fields as plain OpenAPI strings when the generated Zod client targets a Zod 3 release without `z.url()`.

**Why:** Orval can translate `format: uri` into `zod.url()`, which fails the workspace typecheck even though the OpenAPI document is valid.

**How to apply:** Prefer plain `type: string` for generated API URL fields unless the workspace's Zod and Orval configuration are upgraded together and the generated output is verified.
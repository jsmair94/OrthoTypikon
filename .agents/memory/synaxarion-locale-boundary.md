---
name: Synaxarion locale boundary
description: Why the live Synaxarion card has its own locale contract instead of reusing database content locales
---

The live Synaxarion card supports translation locales independently from the database-backed content tables. Greek is supported for the live card even though the database locale enum does not include Greek.

**Why:** Adding Greek to the shared database content locale type makes Drizzle queries incompatible with the existing PostgreSQL enum and falsely implies that Greek rows exist in every content table.

**How to apply:** Keep the Synaxarion endpoint and generated client on a dedicated locale schema when adding translation-only languages; do not broaden the shared database `Locale` type unless the schema and data are migrated too.
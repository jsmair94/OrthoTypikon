---
name: PostgreSQL index storage settings
description: How schema validation should compare Drizzle index storage parameters with PostgreSQL.
---

Canonicalize expected index storage parameters by creating temporary indexes with the declared `WITH` settings, then compare sorted `pg_class.reloptions` arrays. This delegates method-specific value normalization to PostgreSQL and makes option ordering irrelevant. Reject unsupported SQL token shapes explicitly rather than interpolating arbitrary schema values.

**Why:** PostgreSQL can normalize equivalent storage values differently from their raw Drizzle representation, and each access method defines its own accepted settings.

**How to apply:** When extending startup index validation, use PostgreSQL's catalog output for both expected and actual values; avoid comparing `String(config.with)` directly.
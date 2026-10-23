---
name: Drizzle migration batch rollback
description: Transaction behavior when one PostgreSQL migration fails during startup.
---

When the API applies multiple pending PostgreSQL migrations together, a SQL error in a later migration rolls back the entire pending batch, not only that migration. Previously successful migration SQL from the same startup attempt is also uncommitted and can run again on retry.

**Why:** The PostgreSQL integration test observed zero applied migration records after the baseline migration succeeded in SQL but a following fixture migration failed. The corrected retry then applied both versions.

**How to apply:** Failure/retry tests should assert that the failed version is absent and that retry can apply the pending migration set; do not assume earlier pending versions remain recorded after a later failure.
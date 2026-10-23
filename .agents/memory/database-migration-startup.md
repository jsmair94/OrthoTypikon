---
name: Database migration startup
description: Production migration timing and safety constraints for the API.
---

For Replit-managed PostgreSQL, let Replit Publish apply production schema changes; production API startup should validate schema and must not replay Drizzle DDL. Development and isolated migration tests may still apply tracked migrations. If production uses an external database, follow its explicitly documented migration workflow because Replit Publish does not migrate it. In tests that launch `pg_ctl` through captured subprocess pipes, pass `-l` to redirect daemon output.

**Why:** Replit Publish already applied the production schema, but API startup replayed an unrecorded Drizzle migration and crashed on an existing relation. PostgreSQL integration tests also need to distinguish a fully current pushed schema from a genuinely pending migration fixture. A spawned PostgreSQL daemon can inherit the caller's output pipes, making a synchronous `pg_ctl start` appear hung despite a ready server.

**How to apply:** Use the Replit Publish flow for managed production schema changes and keep the API gated on successful schema validation. For external production databases, confirm the target and use the project's documented migration process.

During schema comparison, exclude `pg_constraint.contype = 'n'` from table-constraint inventories when per-column nullability is already verified separately through `pg_attribute.attnotnull`. Do not skip other constraint types.

**Why:** PostgreSQL 18 exposes column-level NOT NULL entries in `pg_constraint`; treating them as unexpected Drizzle table constraints can prevent an otherwise valid production schema from starting.

**How to apply:** Apply the filter to both missing- and unexpected-table-constraint queries while retaining the explicit nullability check.
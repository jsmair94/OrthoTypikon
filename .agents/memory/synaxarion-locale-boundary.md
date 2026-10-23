---
name: OrthoTypikon content locales
description: Active stored-content languages and the separate live Synaxarion translation contract
---

Stored content and admin editing use Arabic, English, and Greek. French was removed from active application/API choices at the user's request, but the PostgreSQL enum retains `fr` so existing French rows are not deleted. The live Synaxarion card has an independent translation locale contract that may include additional languages.

**Why:** The user explicitly chose Arabic, English, and Greek for stored content and asked to remove French. Preserving legacy French rows avoids irreversible data loss while removing French from the supported product contract.

**How to apply:** Keep stored-content locale enums, OpenAPI, generated clients, services, and admin choices aligned on `ar`, `en`, and `el`. Do not drop `fr` from PostgreSQL or delete French rows without explicit deletion approval. Keep live Synaxarion translation locales separate from stored-content locales.
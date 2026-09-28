# OrthoTypikon

An Orthodox spiritual companion with a liturgical calendar, prayers, audio,
saints, fasting guidance, and daily content.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/orthotypikon run build:apk` — generate the directly installable Android APK in `artifacts/orthotypikon/dist/`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/orthotypikon` — Expo mobile app
- `artifacts/orthotypikon/app.json` — app identity, Android package, icon, splash, and native plugins
- `artifacts/orthotypikon/ANDROID_APK.md` — APK prerequisites, build, download, install, and Play Store limitations
- `artifacts/orthotypikon/scripts/build-apk.js` — repeatable local Android APK build

## Architecture decisions

- The Android package remains `com.orthotypikon.app`; native project files are regenerated from the static Expo config and are not committed.
- The APK build uses local Gradle and bootstraps only cached Android SDK components, avoiding Expo Go and hosted-build credentials.
- Local calendar, prayer, audio, and learning content remains usable without an API endpoint; community requests show the app's existing offline state.

## Product

The app onboards users into Arabic, English, or Greek, supports Gregorian or
Julian calendar preferences, and provides home, calendar, library, live,
prayer, fasting, learning, compass, pastoral, and widget experiences.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do not use the dev workflow's `REPLIT_DEV_DOMAIN` for an installed build. `build:apk` accepts only an optional reachable HTTPS `EXPO_PUBLIC_DOMAIN` and otherwise preserves offline behavior.
- The hand-install APK is not a Play Store-signed App Bundle; see `artifacts/orthotypikon/ANDROID_APK.md`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

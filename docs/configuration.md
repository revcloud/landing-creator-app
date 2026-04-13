# Configuration

## Purpose

This document captures runtime configuration, frontend constants, and operational flags used by the app.

## Build and Tooling Configuration

## `package.json`

- Scripts:
  - `dev` -> `vite`
  - `build` -> `vite build`
  - `preview` -> `vite preview`
  - `lint` -> `eslint .`
  - `dev:server` -> `node server/index.js` (target file not present)

## `vite.config.js`

- Uses `@vitejs/plugin-react` and `@tailwindcss/vite`.
- Dev proxy routes `/api` to `http://localhost:3501`.

Note: current landing-page creator API module calls full remote URL directly, so proxy is mostly relevant for any future relative `/api` usage.

## `eslint.config.js`

- ESLint flat config for `js/jsx`.
- Includes React hooks and React refresh rules.
- Ignores `dist/`.

## Frontend Runtime Constants

## Template Definitions

In `src/features/landing-page-creator/constants.js`:

- `templates[]` defines:
  - template id
  - display name
  - screenshot path
  - default preview URL

## Default Editor Config

`defaultConfig` shape:

- `hero`
  - `heading`
  - `subheading`
  - `ctaText`
  - `ctaColor`
- `brand`
  - `logo`
  - `name`
  - `title`
  - `favicon`

## Status Values

- `editStatusValues = ["idle", "submitting", "building", "live"]`

## Hardcoded Runtime Values

- API base URL in `dlpcApi.js` targets stage.
- `TEMP_USER_ID = "21"` in both `VariantSelector.jsx` and `Editor.jsx`.
- Default env-toggle state in editor:
  - `VITE_ENABLE_LANDING_PAGE_API: true`
  - `VITE_ENABLE_GEOLOCATION: true`
  - `VITE_ENABLE_IDENTITY_API: true`

These are runtime application values, not build-time `.env` reads.

## Local Storage Keys

`editorStorage.js` uses:

- `dlpc:deploymentUrl:{userId}:{templateId}:{siteId}`

Used for warm start and persistent preview URL across reloads.

## Environment Variable Handling

The repo currently does not include:

- `.env`
- `.env.example`
- direct `import.meta.env.*` reads in source files

Instead, env-like values are edited in UI and sent to backend through `upsert-env`.

## Known Gaps and Recommendations

- Add `.env.example` if you want environment-based API targets.
- Replace `TEMP_USER_ID` with authenticated user identity source.
- Consider making API base URL configurable by environment to avoid source edits for stage/prod switches.

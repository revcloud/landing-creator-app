# Development Guide

## Purpose

This guide explains how to run, lint, and build the project locally, plus common troubleshooting steps.

## Prerequisites

- Node.js 18+
- npm 9+

## Install Dependencies

```bash
npm install
```

## Run the Frontend

```bash
npm run dev
```

Expected behavior:

- Vite dev server starts.
- App is available on a local Vite URL (typically `http://localhost:5173`).

## Lint

```bash
npm run lint
```

Lint config is in `eslint.config.js` and targets `js/jsx` files.

## Build + Preview

```bash
npm run build
npm run preview
```

`build` outputs to `dist/`; `preview` serves the production build locally.

## Working with the Feature

Primary files to inspect when changing behavior:

- `src/App.jsx` (route wiring)
- `src/features/landing-page-creator/VariantSelector.jsx` (selection + init/deploy)
- `src/features/landing-page-creator/Editor.jsx` (main lifecycle)
- `src/features/landing-page-creator/dlpcApi.js` (all backend calls)

## Troubleshooting

## Editor Redirects to Home

Cause:

- `/editor` route requires resolvable template via state or `templateId` query.

Check:

- navigation state includes template data, or URL contains valid `templateId`.

## Variant List Is Empty

Cause:

- backend returned empty configs for template or request failed.

Check:

- network call for `GET /configs/:templateId`
- server response shape includes `data.configs`

## Preview Not Updating After Deploy/Edit

Cause:

- deployment not ready yet, polling timeout, or iframe readiness message not received.

Check:

- deployment polling response (`latest-deployment-url`)
- browser console for iframe or cross-origin postMessage issues

## `npm run dev:server` Fails

Cause:

- `server/index.js` is referenced but no `server/` directory exists in this repository.

Action:

- run frontend only (`npm run dev`) unless backend service is available elsewhere.

## Contribution Notes

- Keep API contract handling changes centralized in `dlpcApi.js`.
- Preserve user-facing status messaging in editor operations; users rely on these transitions for long-running deploy actions.

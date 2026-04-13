# Landing Creator App

Landing Creator App is a React + Vite frontend for selecting landing page templates, choosing a variant configuration, and editing/deploying the selected variant through the DLPC API.

## What This App Does

- Lets users choose from available templates and generated variants.
- Initializes or reuses a backend workspace for a selected template + variant.
- Deploys template configuration updates and AI prompt edits.
- Shows deployment status and preview readiness directly in the editor.
- Supports environment-flag updates and custom-domain setup through backend endpoints.

## Tech Stack

- React 19
- React Router 7
- Vite 7
- Tailwind CSS 4
- ESLint 9 (flat config)

## Project Structure

```text
.
├── public/                         # Static assets (screenshots, vite.svg)
├── src/
│   ├── App.jsx                     # Route definitions
│   ├── main.jsx                    # React bootstrap + BrowserRouter
│   └── features/landing-page-creator/
│       ├── Editor.jsx              # Main editor orchestration
│       ├── VariantSelector.jsx     # Variant selection + init/deploy transition
│       ├── TemplateGallery.jsx     # Template selection screen
│       ├── dlpcApi.js              # API integration layer
│       └── ...                     # UI + hooks for editing flow
├── vite.config.js                  # Vite + /api dev proxy config
├── eslint.config.js                # ESLint setup
└── package.json                    # Scripts + dependencies
```

## Quickstart

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run Frontend

```bash
npm run dev
```

Default Vite URL is usually `http://localhost:5173`.

## Available Scripts

- `npm run dev`: Start Vite dev server.
- `npm run build`: Create production build in `dist/`.
- `npm run preview`: Preview production build locally.
- `npm run lint`: Run ESLint across the repository.
- `npm run dev:server`: Runs `node server/index.js` (currently missing in this repo; see Known Gaps).

## Route Map

- `/`: Template gallery (`TemplateGallery`).
- `/template-variants`: Variant picker (`VariantSelector`), requires template selection.
- `/editor`: Editor (`Editor`) for selected template and variant.

If no valid template is provided in state/query, the app redirects back to `/`.

## Feature Flow Snapshot

1. Select template in gallery.
2. Load variants for that template from `GET /configs/:templateId`.
3. Select variant and initialize workspace (`POST /init`).
4. Deploy variant if no reusable workspace URL is available (`POST /deploy`).
5. Enter editor and apply:
   - AI edits (`POST /ai-edit`)
   - Manual config deploys (`POST /deploy`)
   - Environment updates (`POST /upsert-env`)
   - Custom domain requests (`POST /custom-domain`)
6. Poll deployment status (`GET /latest-deployment-url/:deploymentId`) until stable URL is ready.

## API Integration

The app currently uses a hardcoded base URL in `src/features/landing-page-creator/dlpcApi.js`:

- `https://api-stage.palisade.ai/api/dlpc`

All network contracts are documented in [docs/api-reference.md](docs/api-reference.md).

## Documentation Index

- [Architecture](docs/architecture.md)
- [Landing Page Creator Flow](docs/landing-page-creator-flow.md)
- [API Reference](docs/api-reference.md)
- [Configuration](docs/configuration.md)
- [Development Guide](docs/development.md)
- [Deployment Notes](docs/deployment-notes.md)

Recommended reading order for new contributors:

1. This README
2. `docs/development.md`
3. `docs/architecture.md`
4. `docs/landing-page-creator-flow.md`
5. `docs/api-reference.md`

## Known Gaps

- `npm run dev:server` points to `server/index.js`, but `server/` is not present in this repository.
- No automated test framework or `npm test` script is currently configured.
- No checked-in `.env.example`; runtime API base is hardcoded in the frontend API module.

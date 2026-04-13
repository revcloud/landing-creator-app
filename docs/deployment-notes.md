# Deployment Notes

## Purpose

This document captures current deployment assumptions and operational notes inferred from frontend behavior.

## Current Deployment Model

- Frontend runs as a Vite-built React SPA.
- Landing pages are deployed through backend DLPC endpoints (not directly from frontend build scripts).
- Preview URLs are often Vercel-hosted and surfaced in app state.

## Deployment Lifecycle in App

1. `init` endpoint determines whether workspace already exists.
2. `deploy` or `ai-edit` may trigger deployment.
3. App polls `latest-deployment-url/:deploymentId` until deployment is ready.
4. Editor refreshes iframe with cache-busting query params:
   - `_did` (deployment id)
   - `_cb` (nonce)

## Custom Domain Workflow

From editor settings:

- User enters domain.
- App calls `POST /custom-domain`.
- On success, app displays DNS instructions:
  - subdomain -> CNAME to `cname.vercel-dns.com`
  - apex/root -> A record `76.76.21.21` (+ optional `www` CNAME)

The app expects users to finish DNS configuration manually in cPanel and then verify in Vercel.

## Environment Toggle Redeploy

Saving environment settings:

- calls `POST /upsert-env`
- reads `redeployId` from response
- polls for live URL if `redeployId` is present

## Operational Assumptions

- A backend service is accessible at the configured API base URL.
- Backend returns deployment identifiers and URLs in one of the normalized shapes used by `dlpcApi.js`.
- Preview pages post `TEMPLATE_READY` messages to parent frame.

## Known Gaps

- No deployment pipeline config exists in this repo (no GitHub Actions, Dockerfile, or host-specific config files).
- `dev:server` script references a missing local backend implementation.
- No documented environment promotion strategy (stage vs prod URL switching is currently source-code level).

## Suggested Hardening

- Move API base URL to environment-driven config.
- Add explicit backend setup documentation (or link to backend repository).
- Add monitoring/retry telemetry around deployment polling failures.

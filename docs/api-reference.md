# API Reference

## Purpose

This document maps frontend API calls in `src/features/landing-page-creator/dlpcApi.js` to backend endpoints and expected payload/response usage.

## Base URL

Current base URL is hardcoded:

- `https://api-stage.palisade.ai/api/dlpc`

Alternative localhost URL exists as a comment only.

## Helper Functions

- `postDlpcJson(path, body)`: POST with JSON body; throws on non-OK.
- `getDlpcJson(path)`: GET helper with same error handling behavior.
- `normalizeDeploymentUrl(rawUrl)`: adds `https://` if protocol missing.
- `parseJsonSafely(text)`: protects non-JSON responses.

## Endpoint Map

### `GET /configs/:templateId`

- Function: `getVariantConfigs(templateId)`
- Used by: `useVariantConfigs`
- Typical usage: fetch variant config list for selected template.

### `POST /init`

- Function: `initEditor({ userId, templateId, siteId })`
- Used by: `VariantSelector` and `Editor` initialization.
- Behavior in UI:
  - checks `message === "Workspace found"` to branch logic.
  - may use `data.vercelProjectUrl` as initial deployment URL.

### `POST /deploy`

- Function: `deployTemplate({ templateId, config, userId, variantId })`
- Sent payload includes `siteId: variantId`.
- Returns normalized structure:
  - `url` (required by caller)
  - `deploymentId` (optional)
  - `message`

### `POST /ai-edit`

- Function: `editTemplate({ templateId, prompt, userId, variantId })`
- Sent payload includes `siteId: variantId`.
- Returns:
  - `error` flag (throws if true)
  - `message`
  - optional `commitSha`
  - optional `deploymentId`
  - optional URL

### `GET /latest-deployment-url/:deploymentId`

- Functions:
  - `getLatestDeploymentUrl({ deploymentId })`
  - `waitForLatestDeploymentUrl({ deploymentId, timeoutMs, intervalMs })`
- Normalizes backend keys for:
  - URL (`deploymentUrl`, `vercelUrl`, `url`, `previewUrl`)
  - ready-state variants (`readyState`, `status`, etc.)
  - alias state (`aliasAssigned`, `alias_assigned`)
- Poll completion condition:
  - URL exists
  - alias is not explicitly false
  - `readyState` is either null or `"READY"`

### `POST /upload`

- Functions:
  - `uploadDlpcFile(file)`
  - `uploadDlpcBrandAsset(file, field)`
- Flow:
  1. request signed upload URL
  2. PUT file to `signedUrl`
  3. return public URL
- `uploadDlpcBrandAsset` maps field to config patch:
  - `logo` -> `{ logo: url }`
  - `favicon` -> `{ favicon: url }`

### `POST /upsert-env`

- Function: `upsertDlpcProjectEnv({ userId, projectName, envValues })`
- Used by: settings save flow in `Editor`.
- Returns parsed `redeployId` from multiple possible backend shapes.

### `POST /custom-domain`

- Function: `addDlpcCustomDomain({ domain, userId, projectName, vercelProjectId })`
- Normalizes domain input and enforces non-empty domain.
- Returns passthrough metadata for project/domain confirmation.

## Frontend Contract Notes

- Callers generally expect thrown errors rather than manual status checks.
- Polling timeout defaults to 120s and interval to 2s for deployment readiness.
- Some endpoints have flexible response parsing to tolerate backend schema differences.

## Known API Risks

- Base URL is environment-specific and hardcoded in source.
- No request cancellation support for long polling calls.
- No auth headers are attached by frontend today (if backend auth changes, this module must evolve).


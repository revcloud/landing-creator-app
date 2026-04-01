const DLPC_API_BASE_URL = "https://api-stage.palisade.ai/api/dlpc";

function normalizeDeploymentUrl(rawUrl) {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Backend may return hostnames without protocol.
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

async function parseJsonSafely(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function postDlpcJson(path, body) {
  const res = await fetch(`${DLPC_API_BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = await parseJsonSafely(text);

  if (!res.ok) {
    const messageFromBody =
      json?.error ?? json?.message ?? (typeof text === "string" ? text : "");
    throw new Error(messageFromBody || "Request failed");
  }

  return json;
}

async function getDlpcJson(path) {
  const res = await fetch(`${DLPC_API_BASE_URL}/${path}`, {
    method: "GET",
  });

  const text = await res.text();
  const json = await parseJsonSafely(text);

  if (!res.ok) {
    const messageFromBody =
      json?.error ?? json?.message ?? (typeof text === "string" ? text : "");
    throw new Error(messageFromBody || "Request failed");
  }

  return json;
}

export async function initEditor({ userId, templateId }) {
  // Backend contract from your spec: { userId, templateId }
  return postDlpcJson("init", { userId, templateId });
}

export async function deployTemplate({ templateId, config, userId }) {
  // Backend contract from your spec: { templateId, config } -> { url, deploymentId? }
  const json = await postDlpcJson("deploy", { templateId, config, userId });

  const data = json?.data ?? {};
  const url = normalizeDeploymentUrl(data?.url ?? json?.url);
  if (!url) throw new Error(json?.message || "No URL in deploy response");

  return {
    url,
    deploymentId: data?.deploymentId,
    message: json?.message ?? "Deployed",
  };
}

export async function editTemplate({ templateId, prompt, userId }) {
  // Backend contract: { templateId, prompt } -> { error, message, data.commitSha, data.deploymentId? }
  const json = await postDlpcJson("ai-edit", { templateId, prompt, userId });

  const data = json?.data ?? {};
  const url = normalizeDeploymentUrl(data?.url ?? json?.url);
  const error = json?.error;

  if (error === true) {
    throw new Error(json?.message || "Edit failed");
  }

  return {
    url, // optional; for AI edit we typically don't need it
    commitSha: data?.commitSha,
    deploymentId: data?.deploymentId,
    message: json?.message ?? "Edit submitted",
    error: error ?? false,
  };
}

function normalizeLatestDeploymentPayload(data) {
  const d = data ?? {};
  const url = normalizeDeploymentUrl(
    d.deploymentUrl ?? d.vercelUrl ?? d.url ?? d.previewUrl ?? null,
  );

  const rawReady =
    d.readyState ?? d.ready_state ?? d.state ?? d.status ?? null;
  const readyState =
    rawReady == null
      ? null
      : String(rawReady).trim().toUpperCase();

  const aliasRaw = d.aliasAssigned ?? d.alias_assigned;
  const aliasAssigned =
    typeof aliasRaw === "boolean"
      ? aliasRaw
      : aliasRaw == null
        ? null
        : Boolean(aliasRaw);

  return {
    deploymentId: d.deploymentId ?? d.deployment_id ?? null,
    url,
    readyState,
    readySubState: d.readySubState ?? d.ready_sub_state ?? null,
    aliasAssigned,
  };
}

/** True when we should stop polling: stable URL + ready deployment state. */
function isLatestDeploymentSettled(result) {
  if (!result) return false;
  if (!result.url) return false;
  if (result.aliasAssigned === false) return false;
  if (result.readyState == null) return true;
  return result.readyState === "READY";
}

function isLatestDeploymentErrored(result) {
  return result?.readyState === "ERROR";
}

export async function getLatestDeploymentUrl({ deploymentId }) {
  const response = await getDlpcJson(
    `latest-deployment-url/${encodeURIComponent(deploymentId)}`,
  );
  const data = response?.data ?? {};
  const normalized = normalizeLatestDeploymentPayload(data);
  return {
    deploymentId: normalized.deploymentId ?? deploymentId,
    url: normalized.url,
    readyState: normalized.readyState,
    readySubState: normalized.readySubState,
    aliasAssigned: normalized.aliasAssigned,
  };
}

export async function waitForLatestDeploymentUrl({
  deploymentId,
  timeoutMs = 120000,
  intervalMs = 2000,
}) {
  if (!deploymentId) return false;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    let result = null;
    try {
      result = await getLatestDeploymentUrl({ deploymentId });
    } catch {
      // Keep polling until timeout; deployment lookup may not be ready yet.
    }

    if (isLatestDeploymentErrored(result)) {
      const details = result?.readySubState ? ` (${result.readySubState})` : "";
      throw new Error(`Deployment entered ERROR state${details}`);
    }
    if (isLatestDeploymentSettled(result)) {
      return result;
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for latest deployment URL");
}

export async function uploadDlpcFile(file) {
  const res = await fetch(DLPC_API_BASE_URL + "/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileName: file.name }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? "Failed to get upload URL");
  }

  const json = await res.json();
  const data = json?.data ?? {};

  const putRes = await fetch(data.signedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!putRes.ok) throw new Error("Upload failed");
  return data?.url;
}

export async function upsertDlpcProjectEnv({
  userId,
  projectName,
  envValues,
}) {
  const response = await postDlpcJson("upsert-env", {
    userId,
    projectName,
    envValues,
  });

  const data = response?.data ?? {};
  const redeployId =
    data?.redeploy?.id ??
    data?.redeployId ??
    data?.deploymentId ??
    response?.redeploy?.id ??
    response?.redeployId ??
    response?.deploymentId ??
    null;

  return {
    raw: response,
    redeployId,
  };
}

/** Uploads a file and returns a `brand` config patch (`logo` or `favicon` URL). */
export async function uploadDlpcBrandAsset(file, field) {
  const url = await uploadDlpcFile(file);
  if (field === "logo") return { logo: url };
  if (field === "favicon") return { favicon: url };
  throw new Error("Unknown brand asset field");
}

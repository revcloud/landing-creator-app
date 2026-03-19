const DLPC_API_BASE_URL = "https://api-stage.palisade.ai/api/dlpc";

// Temporary auth token used by the existing implementation.
// Centralized here so we can replace it later with real user auth.

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

export async function initEditor({ userId, templateId }) {
  // Backend contract from your spec: { userId, templateId }
  return postDlpcJson("init", { userId, templateId });
}

export async function deployTemplate({ templateId, config, userId }) {
  // Backend contract from your spec: { templateId, config } -> { url, deploymentId? }
  const json = await postDlpcJson("deploy", { templateId, config, userId });

  const data = json?.data ?? {};
  const url = data?.url ?? json?.url;
  if (!url) throw new Error(json?.message || "No URL in deploy response");

  return {
    url,
    deploymentId: data?.deploymentId,
    message: json?.message ?? "Deployed",
  };
}

export async function editTemplate({ templateId, prompt, userId }) {
  // Backend contract: { templateId, prompt } -> { error, message, data.files, deploymentId? }
  const json = await postDlpcJson("ai-edit", { templateId, prompt, userId });

  const data = json?.data ?? {};
  const url = data?.url ?? json?.url;
  const error = json?.error;

  if (error === true) {
    throw new Error(json?.message || "Edit failed");
  }

  return {
    url, // optional; for AI edit we typically don't need it
    deploymentId: data?.deploymentId,
    message: json?.message ?? "Edit submitted",
    error: error ?? false,
  };
}


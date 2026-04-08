function getDeploymentCacheKey(userId, templateId, siteId = "default") {
  return `dlpc:deploymentUrl:${userId}:${templateId}:${siteId}`;
}

export function readCachedDeploymentUrl(userId, templateId, siteId = "default") {
  try {
    const key = getDeploymentCacheKey(userId, templateId, siteId);
    const url = window.localStorage.getItem(key);
    return url && typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

export function writeCachedDeploymentUrl(
  userId,
  templateId,
  url,
  siteId = "default",
) {
  try {
    if (!url) return;
    const key = getDeploymentCacheKey(userId, templateId, siteId);
    window.localStorage.setItem(key, url);
  } catch {
    // Best-effort caching only.
  }
}


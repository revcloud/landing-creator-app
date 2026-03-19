function getDeploymentCacheKey(userId, templateId) {
  return `dlpc:deploymentUrl:${userId}:${templateId}`;
}

export function readCachedDeploymentUrl(userId, templateId) {
  try {
    const key = getDeploymentCacheKey(userId, templateId);
    const url = window.localStorage.getItem(key);
    return url && typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

export function writeCachedDeploymentUrl(userId, templateId, url) {
  try {
    if (!url) return;
    const key = getDeploymentCacheKey(userId, templateId);
    window.localStorage.setItem(key, url);
  } catch {
    // Best-effort caching only.
  }
}


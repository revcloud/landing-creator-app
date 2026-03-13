export function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] ?? {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export const templates = [
  {
    id: "template-1",
    name: "Template 1",
    screenshot: "/screenshots/template-1.png",
    previewUrl: "https://landing-1-default.vercel.app/",
  },
  {
    id: "template-2",
    name: "Template 2",
    screenshot: "/screenshots/template-2.png",
    previewUrl: "https://template-2-preview.vercel.app",
  },
];

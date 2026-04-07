import { useEffect, useState } from "react";
import { getVariantConfigs } from "./dlpcApi";

export function useVariantConfigs(templateId) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!templateId) {
      setConfigs([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setConfigs([]);

    getVariantConfigs(templateId)
      .then(({ data: next }) => setConfigs(next.configs ?? []))
      .catch((err) => setError(err.message ?? "Failed to load variants"))
      .finally(() => setLoading(false));
  }, [templateId]);

  return { configs, loading, error };
}

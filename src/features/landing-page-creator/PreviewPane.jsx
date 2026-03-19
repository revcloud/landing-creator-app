import { useMemo } from "react";

function PreviewPane({ iframeRef, src, iframeKey, nonce }) {
  const cacheBustedSrc = useMemo(() => {
    if (!src) return src;
    try {
      const url = new URL(src);
      url.searchParams.set("_cb", String(nonce));
      return url.toString();
    } catch {
      // If `src` isn't a valid absolute URL, fall back to the original value.
      return src;
    }
  }, [src, nonce]);

  return (
    <div className="flex-1 min-h-0 bg-neutral-200">
      <iframe
        key={iframeKey}
        ref={iframeRef}
        src={cacheBustedSrc}
        title="Template preview"
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

export default PreviewPane;


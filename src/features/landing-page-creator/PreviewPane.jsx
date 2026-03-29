import { useMemo } from "react";

function PreviewPane({
  iframeRef,
  src,
  iframeKey,
  nonce,
  deploymentId,
  onLoad,
  ready = true,
}) {
  const cacheBustedSrc = useMemo(() => {
    if (!src) return src;
    try {
      const url = new URL(src);
      if (deploymentId) {
        url.searchParams.set("_did", String(deploymentId));
      }
      url.searchParams.set("_cb", String(nonce));
      return url.toString();
    } catch {
      return src;
    }
  }, [src, nonce, deploymentId]);

  return (
    <div className="flex-1 min-h-0 bg-neutral-200 relative">
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-200">
          <div className="text-center text-neutral-500">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-600" />
            <p className="text-sm">Loading preview…</p>
          </div>
        </div>
      )}
      <iframe
        key={iframeKey}
        ref={iframeRef}
        src={cacheBustedSrc}
        onLoad={onLoad}
        title="Template preview"
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
        style={{ visibility: ready ? "visible" : "hidden" }}
      />
    </div>
  );
}

export default PreviewPane;

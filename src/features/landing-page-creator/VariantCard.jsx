import { useEffect, useLayoutEffect, useRef, useState } from "react";

const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 800;

export default function VariantCard({
  config,
  templateUrl,
  index,
  isInitiallyVisible,
  onSelect,
  selecting,
}) {
  const clipRef = useRef(null);
  const iframeRef = useRef(null);
  const [iframeMounted, setIframeMounted] = useState(isInitiallyVisible);
  const [scale, setScale] = useState(0.4);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (iframeMounted || isInitiallyVisible) return;

    const el = clipRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIframeMounted(true);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [iframeMounted, isInitiallyVisible]);

  useLayoutEffect(() => {
    const el = clipRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / PREVIEW_WIDTH);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!iframeMounted || !iframeLoaded) return;

    const sendConfig = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "CONFIG_UPDATE", config },
          "*",
        );
      } catch {
        // ignore
      }
    };

    // Send immediately, then retry briefly in case template app
    // starts listeners slightly after iframe load.
    sendConfig();
    const timers = [150, 500, 1000].map((delay) =>
      window.setTimeout(sendConfig, delay),
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [config, iframeLoaded, iframeMounted]);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div
        ref={clipRef}
        className="relative w-full overflow-hidden rounded-t-lg"
        style={{ height: 400 }}
      >
        {!iframeMounted ? (
          <div className="absolute inset-0 animate-pulse bg-neutral-200" />
        ) : (
          <div
            style={{
              width: PREVIEW_WIDTH,
              height: PREVIEW_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
          >
            <iframe
              ref={iframeRef}
              title={`Variant preview ${index + 1}`}
              src={templateUrl}
              width={PREVIEW_WIDTH}
              height={PREVIEW_HEIGHT}
              onLoad={() => setIframeLoaded(true)}
              className="block border-0"
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
          <button
            type="button"
            disabled={selecting}
            onClick={() => onSelect(config)}
            className="pointer-events-auto rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

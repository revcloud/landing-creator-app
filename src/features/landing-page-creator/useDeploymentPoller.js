import { useCallback, useRef } from "react";

export function useDeploymentPoller() {
  const waiterRef = useRef(null);

  const waitForIframeTemplateReady = useCallback(
    ({ timeoutMs = 120000 } = {}) =>
      new Promise((resolve, reject) => {
        const currentWait = {};

        const timeoutId = window.setTimeout(() => {
          if (waiterRef.current !== currentWait) return;
          waiterRef.current = null;
          reject(new Error("Timed out waiting for deployment to become live"));
        }, timeoutMs);

        waiterRef.current = {
          currentWait,
          resolve: (value) => {
            window.clearTimeout(timeoutId);
            if (waiterRef.current?.currentWait !== currentWait) return;
            waiterRef.current = null;
            resolve(value);
          },
          reject: (err) => {
            window.clearTimeout(timeoutId);
            if (waiterRef.current?.currentWait !== currentWait) return;
            waiterRef.current = null;
            reject(err);
          },
        };
      }),
    [],
  );

  const notifyIframeTemplateReady = useCallback(() => {
    const waiter = waiterRef.current;
    if (!waiter) return;
    waiter.resolve(true);
  }, []);

  return { waitForIframeTemplateReady, notifyIframeTemplateReady };
}


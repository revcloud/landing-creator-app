import { useEffect } from "react";

function parseMessageData(data) {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

export function usePostMessage({ previewOrigins, onTemplateReady, onElementClicked }) {
  useEffect(() => {
    function handleMessage(event) {
      const allowedOrigins = [
        window.location.origin,
        ...(previewOrigins ?? []),
      ];
      if (!allowedOrigins.includes(event.origin)) return;

      const message = parseMessageData(event.data);
      if (!message?.type) return;

      if (message.type === "TEMPLATE_READY") {
        onTemplateReady?.();
      } else if (message.type === "ELEMENT_CLICKED") {
        const field = message.field ?? message.element;
        if (field) onElementClicked?.(field);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onElementClicked, onTemplateReady, previewOrigins]);
}


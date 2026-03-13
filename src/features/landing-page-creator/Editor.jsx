import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

async function deployToVercel(templateId, config) {
  const url = "https://api-stage.palisade.ai/api/dlpc/deploy";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-auth-token":
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTgwLCJpYXQiOjE3NzMwODcxMDUsImV4cCI6MTc3MzE3MzUwNX0.i8uELrrHFYddutxqCFcbCcKEcpRC_Bl69oGxoThChpM",
    },
    body: JSON.stringify({ templateId, config }),
  });
  const text = await res.text();
  if (!res.ok) {
    let message = "Deploy failed";
    try {
      const json = JSON.parse(text);
      if (json.error) message = json.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  const json = JSON.parse(text);
  if (json.error) throw new Error(json.message || "Deploy failed");
  const deployUrl = json.data?.url;
  if (!deployUrl) throw new Error(json.message || "No URL in response");
  return {
    url: deployUrl,
    deploymentId: json.data?.deploymentId,
    message: json.message,
  };
}

function Editor({ template }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState({});
  const [iframeReady, setIframeReady] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [isDeployingState, setIsDeployingState] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [deployError, setDeployError] = useState(null);

  const iframeRef = useRef(null);
  const isProcessing = useRef(false);
  const isDeploying = useRef(false);

  const previewOrigin =
    typeof template?.previewUrl === "string"
      ? new URL(template.previewUrl).origin
      : null;

  useEffect(() => {
    setIframeReady(false);
  }, [template?.id]);

  useEffect(() => {
    function handleMessage(event) {
      const allowedOrigins = [
        window.location.origin,
        ...(previewOrigin ? [previewOrigin] : []),
      ];
      if (!allowedOrigins.includes(event.origin)) return;

      let data;
      try {
        data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!data?.type) return;

      if (data.type === "TEMPLATE_READY") {
        setIframeReady(true);
      } else if (data.type === "ELEMENT_CLICKED") {
        if (isProcessing.current) return;
        const field = data.field ?? data.element;
        if (field) {
          isProcessing.current = true;
          setActiveField(field);
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [previewOrigin]);

  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "CONFIG_UPDATE", config },
      "*",
    );
  }, [iframeReady, config]);

  const handleDeploy = async () => {
    if (isDeploying.current) return;
    isDeploying.current = true;
    setIsDeployingState(true);
    setDeployError(null);
    setDeployResult(null);
    try {
      const result = await deployToVercel(template.id, config);
      setDeployResult(result);
    } catch (err) {
      setDeployError(err.message);
    } finally {
      isDeploying.current = false;
      setIsDeployingState(false);
    }
  };

  const handleCloseSidebar = () => {
    isProcessing.current = false;
    setActiveField(null);
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 min-h-0">
        <aside className="flex w-[20%] min-w-[280px] flex-col border-r border-neutral-200 bg-neutral-50">
          <div className="border-b border-neutral-200 p-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              ← Back to templates
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <Sidebar
              activeField={activeField}
              config={config}
              onChange={setConfig}
              onClose={handleCloseSidebar}
            />
            {activeField == null && (
              <div className="p-4 text-sm text-neutral-500">
                Click an element in the preview to edit it.
              </div>
            )}
          </div>
          <div className="sticky bottom-0 border-t border-neutral-200 bg-white p-4">
            <button
              type="button"
              onClick={handleDeploy}
              disabled={isDeployingState}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isDeployingState ? "Deploying…" : "Deploy"}
            </button>
            {deployResult && (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-medium text-green-700">
                  {deployResult.message ?? "Deployed"}
                </p>
                <a
                  href={deployResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-indigo-600 underline break-all hover:text-indigo-800"
                >
                  {deployResult.url}
                </a>
                {deployResult.deploymentId && (
                  <p className="text-xs text-neutral-500">
                    Deployment: {deployResult.deploymentId}
                  </p>
                )}
              </div>
            )}
            {deployError && (
              <p className="mt-2 text-sm text-red-600">{deployError}</p>
            )}
          </div>
        </aside>
        <div className="flex-1 min-h-0 bg-neutral-200">
          <iframe
            key={template?.id}
            ref={iframeRef}
            src={template?.previewUrl ?? ""}
            title="Template preview"
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

export default Editor;

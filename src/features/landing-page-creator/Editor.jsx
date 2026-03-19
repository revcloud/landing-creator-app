import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import InitLoader from "./InitLoader";
import { defaultConfig } from "./constants";
import { deployTemplate, editTemplate, initEditor } from "./dlpcApi";
import {
  readCachedDeploymentUrl,
  writeCachedDeploymentUrl,
} from "./editorStorage";
import { useDeploymentPoller } from "./useDeploymentPoller";
import { usePostMessage } from "./usePostMessage";
import LeftPanel from "./LeftPanel";
import PreviewPane from "./PreviewPane";

const TEMP_USER_ID = "4";

function safeOrigin(url) {
  if (typeof url !== "string" || !url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function Editor({ template }) {
  const navigate = useNavigate();

  const [initStatus, setInitStatus] = useState("loading"); // 'loading' | 'ready' | 'error'
  const [deploymentUrl, setDeploymentUrl] = useState(null);
  const [initStatusMessages, setInitStatusMessages] = useState([]);
  const [initError, setInitError] = useState(null);

  const [config, setConfig] = useState(defaultConfig);
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeRefreshNonce, setIframeRefreshNonce] = useState(0);

  const [messages, setMessages] = useState([]);
  const [editStatus, setEditStatus] = useState("idle");

  const [activeField, setActiveField] = useState(null);
  const iframeRef = useRef(null);
  const isProcessing = useRef(false);

  const { waitForIframeTemplateReady, notifyIframeTemplateReady } =
    useDeploymentPoller();

  const previewOrigins = useMemo(() => {
    return [safeOrigin(template?.previewUrl), safeOrigin(deploymentUrl)].filter(
      Boolean,
    );
  }, [template?.previewUrl, deploymentUrl]);

  useEffect(() => {
    setIframeReady(false);
  }, [deploymentUrl, iframeRefreshNonce]);

  usePostMessage({
    previewOrigins,
    onTemplateReady: () => {
      setIframeReady(true);
      notifyIframeTemplateReady();
    },
    onElementClicked: (field) => {
      if (isProcessing.current) return;
      isProcessing.current = true;
      setActiveField(field);
    },
  });

  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "CONFIG_UPDATE", config },
      "*",
    );
  }, [iframeReady, config]);

  useEffect(() => {
    let cancelled = false;

    async function runInitAndDeploy() {
      setInitStatus("loading");
      setInitError(null);
      setInitStatusMessages([]);
      setMessages([]);
      setEditStatus("idle");
      setActiveField(null);
      isProcessing.current = false;
      setConfig(defaultConfig);

      const cachedUrl = readCachedDeploymentUrl(TEMP_USER_ID, template.id);
      if (cachedUrl) {
        // Warm load immediately. UI will still show the init overlay until fresh deploy is live.
        setDeploymentUrl(cachedUrl);
      } else {
        setDeploymentUrl(null);
      }

      const pushStatus = (m) => {
        if (cancelled) return;
        setInitStatusMessages((prev) => [...prev, m]);
      };

      try {
        pushStatus("Initializing editor...");
        await initEditor({ userId: TEMP_USER_ID, templateId: template.id });

        pushStatus("Deploying default configuration...");
        const { url } = await deployTemplate({
          templateId: template.id,
          config: defaultConfig,
          userId: TEMP_USER_ID,
        });

        pushStatus("Waiting for deployment to become live...");

        const readyPromise = waitForIframeTemplateReady({
          timeoutMs: 120000,
        });
        setDeploymentUrl(url);
        await readyPromise;

        if (cancelled) return;
        writeCachedDeploymentUrl(TEMP_USER_ID, template.id, url);
        setInitStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setInitError(err?.message ?? "Initialization failed");
        setInitStatus("error");
      }
    }

    runInitAndDeploy();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init depends on template.id
  }, [template?.id]);

  const handleCloseSidebar = () => {
    isProcessing.current = false;
    setActiveField(null);
  };

  const createId = () =>
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const updateMessageById = (id, patch) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  };

  const handlePromptSubmit = async (prompt) => {
    if (editStatus !== "idle") return;

    const userMessageId = createId();
    const systemMessageId = createId();

    setEditStatus("submitting");
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        text: prompt,
      },
      {
        id: systemMessageId,
        role: "system",
        text: "Submitting your edit...",
        status: "submitting",
      },
    ]);

    try {
      // This triggers the redeploy; we then wait until the iframe signals it is ready.
      const editResult = await editTemplate({
        templateId: template.id,
        prompt,
        userId: TEMP_USER_ID,
      });

      const { error } = editResult ?? {};
      if (error !== false) {
        throw new Error(editResult?.message || "Edit failed");
      }

      const readyPromise = waitForIframeTemplateReady({
        timeoutMs: 120000,
      });

      // AI edit does not return a new deployment URL. Keep the existing one
      // and just remount the iframe so the user sees repo changes.
      const currentDeploymentUrl = deploymentUrl;

      // Force a hard iframe remount even if the deployment URL stays the same,
      // so the user sees the updated landing page.
      setIframeRefreshNonce((n) => n + 1);
      setEditStatus("building");
      updateMessageById(systemMessageId, {
        text: "Building the updated landing page...",
        status: "building",
      });
      await readyPromise;

      if (currentDeploymentUrl) {
        writeCachedDeploymentUrl(TEMP_USER_ID, template.id, currentDeploymentUrl);
      }
      setEditStatus("live");
      updateMessageById(systemMessageId, {
        text: "Your landing page is live.",
        status: "live",
        url: currentDeploymentUrl,
      });

      setEditStatus("idle");
    } catch (err) {
      console.log("err", err);
      updateMessageById(systemMessageId, {
        role: "error",
        text: err?.message ?? "Edit failed",
        status: undefined,
      });
      setEditStatus("idle");
    } finally {
      // No-op: editStatus is handled in the try/catch paths.
    }
  };

  return (
    <div className="relative flex h-screen flex-row">
      <LeftPanel
        template={template}
        initStatus={initStatus}
        initError={initError}
        deploymentUrl={deploymentUrl}
        messages={messages}
        activeField={activeField}
        config={config}
        onConfigChange={setConfig}
        onConfigClose={handleCloseSidebar}
        editStatus={editStatus}
        onPromptSubmit={handlePromptSubmit}
        onBack={() => navigate("/")}
      />

      <PreviewPane
        iframeRef={iframeRef}
        src={deploymentUrl ?? template?.previewUrl ?? ""}
        iframeKey={`${deploymentUrl ?? template?.id}-${iframeRefreshNonce}`}
        nonce={iframeRefreshNonce}
      />

      {initStatus === "loading" && (
        <InitLoader statusMessages={initStatusMessages} error={initError} />
      )}
    </div>
  );
}

export default Editor;

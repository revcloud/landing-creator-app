import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import InitLoader from "./InitLoader";
import { defaultConfig } from "./constants";
import {
  deployTemplate,
  editTemplate,
  initEditor,
  waitForLatestDeploymentUrl,
} from "./dlpcApi";
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
  const [currentDeploymentId, setCurrentDeploymentId] = useState(null);

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
      setCurrentDeploymentId(null);

      const cachedUrl = readCachedDeploymentUrl(TEMP_USER_ID, template.id);
      const fallbackPreviewUrl =
        typeof template?.previewUrl === "string" && template.previewUrl
          ? template.previewUrl
          : null;
      const initialUrl = cachedUrl || fallbackPreviewUrl;
      if (cachedUrl) {
        // Warm load immediately.
        setDeploymentUrl(cachedUrl);
      } else if (fallbackPreviewUrl) {
        setDeploymentUrl(fallbackPreviewUrl);
      } else {
        setDeploymentUrl(null);
      }

      const pushStatus = (m) => {
        if (cancelled) return;
        setInitStatusMessages((prev) => [...prev, m]);
      };

      try {
        pushStatus("Initializing editor...");
        const response = await initEditor({
          userId: TEMP_USER_ID,
          templateId: template.id,
        });

        let url = response.data?.vercelProjectUrl || initialUrl;
        let deployedNow = false;
        if (!url) {
          pushStatus("Deploying default configuration...");
          const deployResult = await deployTemplate({
            templateId: template.id,
            config: defaultConfig,
            userId: TEMP_USER_ID,
          });
          url = deployResult.url;
          setCurrentDeploymentId(deployResult?.deploymentId ?? null);
          deployedNow = true;
        }

        if (url !== deploymentUrl) {
          setDeploymentUrl(url);
        }

        if (deployedNow) {
          pushStatus("Waiting for deployment to become live...");
          await waitForIframeTemplateReady({
            timeoutMs: 120000,
          });
        } else {
          pushStatus("Using existing deployment...");
        }

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

  const sleep = (ms) =>
    new Promise((resolve) => window.setTimeout(resolve, ms));

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
      // AI edit commits files; Vercel deploy is triggered by that commit.
      const editResult = await editTemplate({
        templateId: template.id,
        prompt,
        userId: TEMP_USER_ID,
      });

      const { error } = editResult ?? {};
      if (error !== false) {
        throw new Error(editResult?.message || "Edit failed");
      }

      setEditStatus("building");
      updateMessageById(systemMessageId, {
        text: "Building changes...",
        status: "building",
      });

      // Backend may return a URL before Vercel finishes building; polling alone
      // does not guarantee a frameable page. The retry loop below is required.
      let liveUrl = editResult?.url ?? deploymentUrl;

      if (editResult?.deploymentId) {
        setCurrentDeploymentId(editResult.deploymentId);
        updateMessageById(systemMessageId, {
          text: "Waiting for Vercel deployment...",
          status: "building",
        });
        try {
          const deploymentResult = await waitForLatestDeploymentUrl({
            deploymentId: editResult.deploymentId,
            timeoutMs: 120000,
            intervalMs: 2000,
          });
          if (deploymentResult?.url) {
            liveUrl = deploymentResult.url;
          }
        } catch {
          // Fall through — attempt to load whatever URL we have.
        }
      } else {
        await sleep(2500);
      }

      if (liveUrl && liveUrl !== deploymentUrl) {
        setDeploymentUrl(liveUrl);
      }

      // Retry loading the iframe — the deployment URL may exist before the
      // build finishes and Vercel's "building" interstitial blocks iframes
      // with X-Frame-Options: deny.  Each attempt remounts the iframe and
      // waits a short window for the TEMPLATE_READY postMessage.
      const MAX_RETRIES = 15;
      const PER_ATTEMPT_TIMEOUT_MS = 8000;
      const RETRY_DELAY_MS = 3000;
      let iframeLoaded = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const readyPromise = waitForIframeTemplateReady({
          timeoutMs: PER_ATTEMPT_TIMEOUT_MS,
        });
        setIframeRefreshNonce((n) => n + 1);
        try {
          await readyPromise;
          iframeLoaded = true;
          break;
        } catch {
          if (attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS);
          }
        }
      }

      if (!iframeLoaded) {
        throw new Error("Deployment did not become ready in time");
      }

      if (liveUrl) {
        writeCachedDeploymentUrl(TEMP_USER_ID, template.id, liveUrl);
      }
      setEditStatus("live");
      updateMessageById(systemMessageId, {
        text: "Changes are live.",
        status: "live",
      });

      setEditStatus("idle");
    } catch (err) {
      updateMessageById(systemMessageId, {
        role: "error",
        text: err?.message ?? "Edit failed",
        status: undefined,
      });
      setEditStatus("idle");
    }
  };

  const handleDeployConfig = async () => {
    if (initStatus !== "ready" || editStatus !== "idle") return;
    if (!template?.id) return;

    const systemMessageId = createId();

    setEditStatus("building");
    setMessages((prev) => [
      ...prev,
      {
        id: systemMessageId,
        role: "system",
        text: "Deploying current configuration...",
        status: "building",
      },
    ]);

    try {
      const deployResult = await deployTemplate({
        templateId: template.id,
        config,
        userId: TEMP_USER_ID,
      });

      let liveUrl = deployResult?.url;

      if (deployResult?.deploymentId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === systemMessageId
              ? { ...m, text: "Waiting for deployment to become live..." }
              : m,
          ),
        );

        const deploymentResult = await waitForLatestDeploymentUrl({
          deploymentId: deployResult.deploymentId,
          timeoutMs: 120000,
          intervalMs: 2000,
        });

        liveUrl = deploymentResult?.url ?? liveUrl;
      }

      // Persist the deployment URL so the next editor load uses it.
      if (liveUrl) {
        writeCachedDeploymentUrl(TEMP_USER_ID, template.id, liveUrl);
      }

      setEditStatus("live");
      updateMessageById(systemMessageId, {
        text: "Configuration deployed.",
        status: "live",
      });
      setEditStatus("idle");
    } catch (err) {
      updateMessageById(systemMessageId, {
        role: "error",
        text: err?.message ?? "Deployment failed",
        status: undefined,
      });
      setEditStatus("idle");
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
        onDeploy={handleDeployConfig}
        onBack={() => navigate("/")}
      />

      <PreviewPane
        iframeRef={iframeRef}
        src={deploymentUrl ?? template?.previewUrl ?? ""}
        deploymentId={currentDeploymentId}
        iframeKey={`${deploymentUrl ?? template?.id}-${currentDeploymentId ?? "no-deploy"}-${iframeRefreshNonce}`}
        nonce={iframeRefreshNonce}
        ready={iframeReady}
      />

      {initStatus === "loading" && (
        <InitLoader statusMessages={initStatusMessages} error={initError} />
      )}
    </div>
  );
}

export default Editor;

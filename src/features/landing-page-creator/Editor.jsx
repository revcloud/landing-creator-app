import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import InitLoader from "./InitLoader";
import { defaultConfig } from "./constants";
import {
  deployTemplate,
  editTemplate,
  initEditor,
  upsertDlpcProjectEnv,
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

const TEMP_USER_ID = "21";
const DEFAULT_ENV_SETTINGS = {
  VITE_ENABLE_LANDING_PAGE_API: true,
  VITE_ENABLE_GEOLOCATION: true,
  VITE_ENABLE_IDENTITY_API: true,
};

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
  const location = useLocation();
  const preloadedDeploymentUrl = location.state?.deploymentUrl;
  const preloadedConfig = location.state?.config;
  const variantId = String(location.state?.variantId ?? "default");

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [envSettings, setEnvSettings] = useState(DEFAULT_ENV_SETTINGS);
  const iframeRef = useRef(null);
  const isProcessing = useRef(false);

  const { waitForIframeTemplateReady, notifyIframeTemplateReady } =
    useDeploymentPoller();

  const markIframeReady = () => {
    setIframeReady(true);
    notifyIframeTemplateReady();
  };

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
    onTemplateReady: markIframeReady,
    onElementClicked: (field) => {
      if (isProcessing.current) return;
      isProcessing.current = true;
      setSettingsOpen(false);
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

    if (preloadedDeploymentUrl) {
      setInitError(null);
      setInitStatusMessages([]);
      setMessages([]);
      setEditStatus("idle");
      setActiveField(null);
      setSettingsOpen(false);
      setSettingsSaving(false);
      setEnvSettings(DEFAULT_ENV_SETTINGS);
      isProcessing.current = false;
      setConfig(preloadedConfig ?? defaultConfig);
      setCurrentDeploymentId(null);
      setDeploymentUrl(preloadedDeploymentUrl);
      setIframeRefreshNonce((n) => n + 1);
      setInitStatus("ready");
      return;
    }

    async function runInitAndDeploy() {
      setInitStatus("loading");
      setInitError(null);
      setInitStatusMessages([]);
      setMessages([]);
      setEditStatus("idle");
      setActiveField(null);
      setSettingsOpen(false);
      setSettingsSaving(false);
      setEnvSettings(DEFAULT_ENV_SETTINGS);
      isProcessing.current = false;
      setConfig(defaultConfig);
      setCurrentDeploymentId(null);

      const cachedUrl = readCachedDeploymentUrl(
        TEMP_USER_ID,
        template.id,
        variantId,
      );
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
          siteId: variantId,
        });

        const workspaceFound = response?.message === "Workspace found";
        let url = response.data?.vercelProjectUrl || initialUrl;
        let deployedNow = false;
        if (!url && !workspaceFound) {
          pushStatus("Deploying default configuration...");
          const deployResult = await deployTemplate({
            templateId: template.id,
            config: defaultConfig,
            userId: TEMP_USER_ID,
            variantId,
          });
          url = deployResult.url;
          setCurrentDeploymentId(deployResult?.deploymentId ?? null);
          deployedNow = true;

          if (deployResult?.deploymentId) {
            const deploymentResult = await waitForLatestDeploymentUrl({
              deploymentId: deployResult.deploymentId,
              timeoutMs: 120000,
              intervalMs: 2000,
            });
            if (deploymentResult?.url) {
              url = deploymentResult.url;
            }
          }
        } else if (workspaceFound) {
          pushStatus("Workspace found. Using existing deployment...");
        }

        if (url) {
          refreshPreviewWithUrl(url);
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
        writeCachedDeploymentUrl(TEMP_USER_ID, template.id, url, variantId);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init depends on template.id and preloaded navigation state
  }, [template?.id, preloadedDeploymentUrl, variantId]);

  const handleCloseSidebar = () => {
    isProcessing.current = false;
    setActiveField(null);
  };

  const handleOpenSettings = () => {
    if (initStatus !== "ready") return;
    if (editStatus !== "idle" || settingsSaving) return;
    isProcessing.current = false;
    setActiveField(null);
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleEnvSettingChange = (key, value) => {
    setEnvSettings((prev) => ({
      ...prev,
      [key]: Boolean(value),
    }));
  };

  const createId = () =>
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const sleep = (ms) =>
    new Promise((resolve) => window.setTimeout(resolve, ms));

  const refreshPreviewWithUrl = (nextUrl) => {
    if (!nextUrl) return;
    setDeploymentUrl(nextUrl);
    // Force iframe remount so PreviewPane appends a fresh cache-busting value.
    setIframeRefreshNonce((n) => n + 1);
  };

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
        variantId,
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
        const deploymentResult = await waitForLatestDeploymentUrl({
          deploymentId: editResult.deploymentId,
          timeoutMs: 120000,
          intervalMs: 2000,
        });
        if (deploymentResult?.url) {
          liveUrl = deploymentResult.url;
        }
      } else {
        await sleep(2500);
      }

      if (!liveUrl) throw new Error("Deployment URL is not available yet");
      refreshPreviewWithUrl(liveUrl);

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
        writeCachedDeploymentUrl(TEMP_USER_ID, template.id, liveUrl, variantId);
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
        variantId,
      });

      let liveUrl = deployResult?.url;
      setCurrentDeploymentId(deployResult?.deploymentId ?? null);

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

      if (liveUrl) {
        refreshPreviewWithUrl(liveUrl);
      }

      // Persist the deployment URL so the next editor load uses it.
      if (liveUrl) {
        writeCachedDeploymentUrl(TEMP_USER_ID, template.id, liveUrl, variantId);
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

  const handleSaveSettings = async () => {
    if (!template?.id || settingsSaving) return;

    const systemMessageId = createId();
    const userId = TEMP_USER_ID;
    const siteId = variantId;
    const templateId = template.id;
    const projectName = `landing-${userId}-${siteId}-${templateId}`;

    setSettingsSaving(true);
    setMessages((prev) => [
      ...prev,
      {
        id: systemMessageId,
        role: "system",
        text: "Saving environment settings...",
        status: "saving",
      },
    ]);

    try {
      const upsertResult = await upsertDlpcProjectEnv({
        userId,
        projectName,
        envValues: {
          VITE_ENABLE_LANDING_PAGE_API: String(
            envSettings.VITE_ENABLE_LANDING_PAGE_API,
          ),
          VITE_ENABLE_GEOLOCATION: String(envSettings.VITE_ENABLE_GEOLOCATION),
          VITE_ENABLE_IDENTITY_API: String(
            envSettings.VITE_ENABLE_IDENTITY_API,
          ),
        },
      });

      const redeployId = upsertResult?.redeployId;
      if (!redeployId) {
        updateMessageById(systemMessageId, {
          text: "Environment settings saved. No redeploy id returned.",
          status: "live",
        });
        setSettingsOpen(false);
        return;
      }

      updateMessageById(systemMessageId, {
        text: "Environment settings saved. Waiting for redeploy...",
        status: "building",
      });

      const deploymentResult = await waitForLatestDeploymentUrl({
        deploymentId: redeployId,
        timeoutMs: 120000,
        intervalMs: 2000,
      });

      const liveUrl = deploymentResult?.url;
      if (!liveUrl) {
        throw new Error("Redeploy completed without a live URL");
      }

      setCurrentDeploymentId(redeployId);
      refreshPreviewWithUrl(liveUrl);
      writeCachedDeploymentUrl(TEMP_USER_ID, template.id, liveUrl, variantId);

      updateMessageById(systemMessageId, {
        text: "Environment settings saved and redeployed.",
        status: "live",
      });
      setSettingsOpen(false);
    } catch (err) {
      updateMessageById(systemMessageId, {
        role: "error",
        text: err?.message ?? "Failed to save environment settings",
        status: undefined,
      });
    } finally {
      setSettingsSaving(false);
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
        settingsOpen={settingsOpen}
        onOpenSettings={handleOpenSettings}
        onCloseSettings={handleCloseSettings}
        envSettings={envSettings}
        onEnvSettingChange={handleEnvSettingChange}
        onSaveSettings={handleSaveSettings}
        settingsSaving={settingsSaving}
      />

      <PreviewPane
        iframeRef={iframeRef}
        src={deploymentUrl ?? template?.previewUrl ?? ""}
        deploymentId={currentDeploymentId}
        iframeKey={`${deploymentUrl ?? template?.id}-${currentDeploymentId ?? "no-deploy"}-${iframeRefreshNonce}`}
        nonce={iframeRefreshNonce}
        onLoad={markIframeReady}
        ready={iframeReady}
      />

      {initStatus === "loading" && (
        <InitLoader statusMessages={initStatusMessages} error={initError} />
      )}
    </div>
  );
}

export default Editor;

import { useMemo, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import InitLoader from "./InitLoader";
import { templates } from "./constants";
import {
  deployTemplate,
  initEditor,
  waitForLatestDeploymentUrl,
} from "./dlpcApi";
import { writeCachedDeploymentUrl } from "./editorStorage";
import { useVariantConfigs } from "./useVariantConfigs";
import VariantCard from "./VariantCard";

const TEMP_USER_ID = "66";

function getVariantId(config, index) {
  const candidate =
    config?.variantId ??
    config?.id ??
    config?.name ??
    config?.slug ??
    `variant-${index + 1}`;
  return String(candidate);
}

export default function VariantSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const templateId = useMemo(() => {
    return location.state?.templateId ?? searchParams.get("templateId") ?? null;
  }, [location.state?.templateId, searchParams]);

  const [selecting, setSelecting] = useState(false);
  const [selectError, setSelectError] = useState(null);
  const [selectStatusMessages, setSelectStatusMessages] = useState([]);

  const { configs, loading, error } = useVariantConfigs(templateId);

  const template = useMemo(() => {
    if (!templateId) return null;
    return templates.find((t) => t.id === templateId) ?? null;
  }, [templateId]);

  if (!templateId) {
    return <Navigate to="/" replace />;
  }

  if (!template) {
    return <Navigate to="/" replace />;
  }

  const templateUrl =
    typeof template.previewUrl === "string" ? template.previewUrl : "";

  const handleSelect = async (config, index) => {
    try {
      setSelecting(true);
      setSelectError(null);
      setSelectStatusMessages([]);
      const variantId = getVariantId(config, index);

      const pushStatus = (m) => {
        setSelectStatusMessages((prev) => [...prev, m]);
      };

      pushStatus("Initializing editor...");
      const initResponse = await initEditor({
        userId: TEMP_USER_ID,
        templateId,
        siteId: variantId,
      });
      const workspaceFound = initResponse?.message === "Workspace found";

      let url = initResponse?.data?.vercelProjectUrl || null;
      if (!workspaceFound) {
        pushStatus("Deploying selected variant...");
        const deployResult = await deployTemplate({
          templateId,
          config,
          userId: TEMP_USER_ID,
          variantId,
        });

        url = deployResult.url;

        if (deployResult?.deploymentId) {
          pushStatus("Waiting for deployment to become live...");
          const deploymentResult = await waitForLatestDeploymentUrl({
            deploymentId: deployResult.deploymentId,
            timeoutMs: 120000,
            intervalMs: 2000,
          });
          if (deploymentResult?.url) {
            url = deploymentResult.url;
          }
        }
      } else {
        pushStatus("Workspace found. Using existing deployment...");
      }

      if (!url) {
        throw new Error("No deployment URL returned");
      }

      writeCachedDeploymentUrl(TEMP_USER_ID, templateId, url, variantId);

      navigate("/editor", {
        state: {
          templateId,
          variantId,
          deploymentUrl: url,
          config,
        },
      });
    } catch (err) {
      setSelectError(err?.message ?? "Selection failed");
      setSelecting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
          >
            Back
          </button>
          <h1 className="text-2xl font-semibold text-neutral-800">
            Choose a variant — {template.name}
          </h1>
        </div>

        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center text-neutral-600">
            Loading variants…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {configs.map((config, index) => (
              <VariantCard
                key={index}
                index={index}
                config={config}
                templateUrl={templateUrl}
                isInitiallyVisible={index < 3}
                onSelect={(selectedConfig) =>
                  handleSelect(selectedConfig, index)
                }
                selecting={selecting}
              />
            ))}
          </div>
        )}

        {!loading && !error && configs.length === 0 && (
          <p className="text-neutral-600">No variants available.</p>
        )}
      </div>

      {selecting && (
        <div className="fixed inset-0 z-50">
          <InitLoader
            statusMessages={selectStatusMessages}
            error={selectError}
          />
        </div>
      )}
    </div>
  );
}

import {
  IoArrowBackOutline,
  IoCloudUploadOutline,
  IoReloadOutline,
  IoSettingsOutline,
} from "react-icons/io5";

function TemplateInfoBar({
  template,
  initStatus,
  deploymentUrl,
  onBack,
  onDeploy,
  onOpenSettings,
  settingsOpen,
  editStatus,
  disabled,
}) {
  const statusText =
    initStatus === "loading"
      ? "Initializing..."
      : initStatus === "error"
        ? "Initialization failed"
        : "Ready";

  const isDeploying = editStatus === "submitting" || editStatus === "building";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-neutral-900">
          {template?.name ?? "Template"}
        </div>
        <div className="truncate text-xs text-neutral-500">
          {statusText} {deploymentUrl ? "• Deployed preview loaded" : ""}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSettings}
          disabled={disabled}
          title={settingsOpen ? "Close settings" : "Open settings"}
          aria-label={settingsOpen ? "Close settings" : "Open settings"}
          className="shrink-0 rounded px-2 py-1 text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IoSettingsOutline />
        </button>

        <button
          type="button"
          onClick={onDeploy}
          disabled={disabled}
          title={isDeploying ? "Deploying configuration" : "Deploy config"}
          aria-label={isDeploying ? "Deploying configuration" : "Deploy config"}
          className="shrink-0 rounded px-2 py-1 text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeploying ? <IoReloadOutline /> : <IoCloudUploadOutline />}
        </button>

        <button
          type="button"
          onClick={onBack}
          title="Back to template gallery"
          aria-label="Back to template gallery"
          className="shrink-0 rounded px-2 py-1 text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <IoArrowBackOutline />
        </button>
      </div>
    </div>
  );
}

export default TemplateInfoBar;

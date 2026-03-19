function TemplateInfoBar({ template, initStatus, deploymentUrl, onBack }) {
  const statusText =
    initStatus === "loading"
      ? "Initializing..."
      : initStatus === "error"
        ? "Initialization failed"
        : "Ready";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 p-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-neutral-900">
          {template?.name ?? "Template"}
        </div>
        <div className="truncate text-xs text-neutral-500">
          {statusText}{" "}
          {deploymentUrl ? "• Deployed preview loaded" : ""}
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="shrink-0 rounded px-2 py-1 text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        ← Back
      </button>
    </div>
  );
}

export default TemplateInfoBar;


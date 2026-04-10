import ConfigPanel from "./ConfigPanel";
import PromptInput from "./PromptInput";
import SessionMessages from "./SessionMessages";
import TemplateInfoBar from "./TemplateInfoBar";

function LeftPanel({
  template,
  initStatus,
  initError,
  deploymentUrl,
  messages,
  activeField,
  config,
  onConfigChange,
  onConfigClose,
  editStatus,
  onPromptSubmit,
  onDeploy,
  onBack,
  settingsOpen,
  onOpenSettings,
  onCloseSettings,
  envSettings,
  onEnvSettingChange,
  onSaveSettings,
  settingsSaving,
  customDomain,
  onCustomDomainChange,
  onAddCustomDomain,
  domainSaving,
}) {
  const isEditorUiLocked =
    editStatus !== "idle" || initStatus !== "ready" || settingsSaving;
  return (
    <div className="flex w-[360px] min-w-[360px] flex-col border-r border-neutral-200 bg-neutral-50">
      <TemplateInfoBar
        template={template}
        initStatus={initStatus}
        deploymentUrl={deploymentUrl}
        editStatus={editStatus}
        disabled={isEditorUiLocked}
        onDeploy={onDeploy}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
        settingsOpen={settingsOpen}
      />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {initStatus === "error" && initError && (
          <div className="border-b border-neutral-200 bg-white p-4 text-sm text-red-600">
            {initError}
          </div>
        )}
        <SessionMessages messages={messages} />

        <div
          className={`border-t border-neutral-200 bg-white overflow-hidden transition-all duration-200 ease-out ${
            settingsOpen
              ? "max-h-[440px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="max-h-[440px] overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-neutral-900">
                Environment settings
              </div>
              <button
                type="button"
                onClick={onCloseSettings}
                className="rounded px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={Boolean(envSettings?.VITE_ENABLE_LANDING_PAGE_API)}
                  onChange={(event) =>
                    onEnvSettingChange?.(
                      "VITE_ENABLE_LANDING_PAGE_API",
                      event.target.checked,
                    )
                  }
                  disabled={settingsSaving}
                />
                Enable Landing Page API
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={Boolean(envSettings?.VITE_ENABLE_GEOLOCATION)}
                  onChange={(event) =>
                    onEnvSettingChange?.(
                      "VITE_ENABLE_GEOLOCATION",
                      event.target.checked,
                    )
                  }
                  disabled={settingsSaving}
                />
                Enable Geolocation
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={Boolean(envSettings?.VITE_ENABLE_IDENTITY_API)}
                  onChange={(event) =>
                    onEnvSettingChange?.(
                      "VITE_ENABLE_IDENTITY_API",
                      event.target.checked,
                    )
                  }
                  disabled={settingsSaving}
                />
                Enable Identity API
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onSaveSettings}
                disabled={settingsSaving}
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingsSaving ? "Saving..." : "Save"}
              </button>
            </div>

            <div className="mt-5 border-t border-neutral-200 pt-4">
              <div className="mb-2 text-sm font-semibold text-neutral-900">
                Custom domain
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={customDomain}
                  onChange={(event) =>
                    onCustomDomainChange?.(event.target.value)
                  }
                  placeholder="www.example.com"
                  disabled={domainSaving || settingsSaving}
                  className="w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-neutral-100"
                />
                <p className="text-xs text-neutral-500">
                  We will add this domain to your Vercel project, then show DNS
                  records to configure in cPanel.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onAddCustomDomain}
                    disabled={domainSaving || settingsSaving}
                    className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {domainSaving ? "Adding..." : "Add domain"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`border-t border-neutral-200 bg-white overflow-hidden transition-all duration-200 ease-out ${
            activeField
              ? "max-h-[520px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="h-full">
            <ConfigPanel
              activeField={activeField}
              config={config}
              onChange={onConfigChange}
              onClose={onConfigClose}
              disabled={isEditorUiLocked}
            />
          </div>
        </div>
      </div>

      <PromptInput
        disabled={isEditorUiLocked}
        onSubmit={(prompt) => onPromptSubmit?.(prompt)}
      />
    </div>
  );
}

export default LeftPanel;

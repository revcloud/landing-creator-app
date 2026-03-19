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
  onBack,
}) {
  const isPromptDisabled = editStatus !== "idle" || initStatus !== "ready";
  const isConfigDisabled = editStatus !== "idle" || initStatus !== "ready";
  console.log("messages", messages);
  return (
    <div className="flex w-[360px] min-w-[360px] flex-col border-r border-neutral-200 bg-neutral-50">
      <TemplateInfoBar
        template={template}
        initStatus={initStatus}
        deploymentUrl={deploymentUrl}
        onBack={onBack}
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
              disabled={isConfigDisabled}
            />
          </div>
        </div>
      </div>

      <PromptInput
        disabled={isPromptDisabled}
        onSubmit={(prompt) => onPromptSubmit?.(prompt)}
      />
    </div>
  );
}

export default LeftPanel;

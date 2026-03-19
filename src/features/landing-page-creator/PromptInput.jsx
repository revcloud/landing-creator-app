import { useState } from "react";

function PromptInput({ disabled, onSubmit }) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="border-t border-neutral-200 bg-white p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled) return;
          const trimmed = prompt.trim();
          if (!trimmed) return;
          onSubmit?.(trimmed);
          setPrompt("");
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe an edit for the landing page..."
          disabled={disabled}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-neutral-100 disabled:text-neutral-500"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default PromptInput;


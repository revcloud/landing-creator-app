function InitLoader({ statusMessages, error }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
            aria-hidden="true"
          />
          <div className="text-sm font-medium text-neutral-800">
            Building your landing page...
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {(statusMessages ?? []).map((m, idx) => (
            <div key={`${idx}-${m}`} className="text-sm text-neutral-600">
              {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InitLoader;


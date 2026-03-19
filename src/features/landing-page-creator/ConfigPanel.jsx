import { useEffect, useState } from "react";

const UPLOAD_AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTgwLCJpYXQiOjE3NzMwODcxMDUsImV4cCI6MTc3MzE3MzUwNX0.i8uELrrHFYddutxqCFcbCcKEcpRC_Bl69oGxoThChpM";

async function uploadDlpcFile(file) {
  const res = await fetch("https://api-stage.palisade.ai/api/dlpc/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": UPLOAD_AUTH_TOKEN,
    },
    body: JSON.stringify({ fileName: file.name }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? "Failed to get upload URL");
  }

  const json = await res.json();
  const data = json?.data ?? {};

  const putRes = await fetch(data.signedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!putRes.ok) throw new Error("Upload failed");
  return data?.url;
}

function ConfigPanel({
  activeField,
  config,
  onChange,
  onClose,
  disabled,
}) {
  const [uploadingField, setUploadingField] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    setUploadError(null);
  }, [activeField]);

  const updateHero = (patch) => {
    onChange((prev) => ({
      ...prev,
      hero: { ...(prev.hero ?? {}), ...patch },
    }));
  };

  const updateBrand = (patch) => {
    onChange((prev) => ({
      ...prev,
      brand: { ...(prev.brand ?? {}), ...patch },
    }));
  };

  const handleFileUpload = async (file, field) => {
    setUploadError(null);
    setUploadingField(field);
    try {
      const url = await uploadDlpcFile(file);
      if (field === "logo") updateBrand({ logo: url });
      if (field === "favicon") updateBrand({ favicon: url });
    } catch (err) {
      setUploadError(err?.message ?? "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  if (!activeField) return null;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 p-4">
        <h2 className="text-lg font-semibold text-neutral-800">
          Edit {activeField}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeField === "h1" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Hero heading
            </span>
            <input
              type="text"
              value={config?.hero?.heading ?? ""}
              disabled={disabled}
              onChange={(e) => updateHero({ heading: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        )}

        {activeField === "subheading" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Subheading
            </span>
            <textarea
              rows={4}
              value={config?.hero?.subheading ?? ""}
              disabled={disabled}
              onChange={(e) => updateHero({ subheading: e.target.value })}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        )}

        {activeField === "cta" && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                CTA text
              </span>
              <input
                type="text"
                value={config?.hero?.ctaText ?? ""}
                disabled={disabled}
                onChange={(e) => updateHero({ ctaText: e.target.value })}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                CTA color
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config?.hero?.ctaColor ?? "#6366f1"}
                  disabled={disabled}
                  onChange={(e) => updateHero({ ctaColor: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border border-neutral-300"
                />
                <span className="text-sm text-neutral-600">
                  {config?.hero?.ctaColor ?? "#6366f1"}
                </span>
              </div>
            </label>
          </div>
        )}

        {activeField === "logo" && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Logo
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={disabled || uploadingField === "logo"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "logo");
                }}
                className="w-full text-sm text-neutral-600 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700"
              />
              {uploadingField === "logo" && (
                <p className="mt-1 text-sm text-neutral-500">Uploading...</p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Brand name
              </span>
              <input
                type="text"
                value={config?.brand?.name ?? ""}
                disabled={disabled}
                onChange={(e) => updateBrand({ name: e.target.value })}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Title
              </span>
              <input
                type="text"
                value={config?.brand?.title ?? ""}
                disabled={disabled}
                onChange={(e) => updateBrand({ title: e.target.value })}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
          </div>
        )}

        {activeField === "favicon" && (
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Favicon
              </span>
              <input
                type="file"
                accept="image/x-icon,image/png"
                disabled={disabled || uploadingField === "favicon"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "favicon");
                }}
                className="w-full text-sm text-neutral-600 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700"
              />
              {uploadingField === "favicon" && (
                <p className="mt-1 text-sm text-neutral-500">Uploading...</p>
              )}
            </label>
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfigPanel;


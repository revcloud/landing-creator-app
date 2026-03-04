import { useEffect, useState } from "react";

const initialDraft = {
  heroHeading: "",
  logo: null,
  brandName: "",
  title: "",
  favicon: null,
  ctaText: "",
  ctaColor: "#6366f1",
};

function Sidebar({ activeField, config, onChange, onClose }) {
  const [draft, setDraft] = useState(initialDraft);
  const [uploadingField, setUploadingField] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    setUploadError(null);
  }, [activeField]);

  useEffect(() => {
    if (activeField == null) return;
    if (activeField === "h1") {
      setDraft((prev) => ({
        ...prev,
        heroHeading: config.hero?.heading ?? "",
      }));
    } else if (activeField === "logo") {
      setDraft((prev) => ({
        ...prev,
        logo: config.brand?.logo ?? null,
        brandName: config.brand?.name ?? "",
        title: config.brand?.title ?? "",
        favicon: config.brand?.favicon ?? null,
      }));
    } else if (activeField === "cta") {
      setDraft((prev) => ({
        ...prev,
        ctaText: config.hero?.ctaText ?? "",
        ctaColor: config.hero?.ctaColor ?? "#6366f1",
      }));
    } else if (activeField === "favicon") {
      setDraft((prev) => ({
        ...prev,
        favicon: config.brand?.favicon ?? null,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only init draft when field opens
  }, [activeField]);

  const handleFileUpload = async (file, field) => {
    setUploadError(null);
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-asset", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      if (field === "logo") {
        setDraft((prev) => ({ ...prev, logo: url }));
      } else if (field === "favicon") {
        setDraft((prev) => ({ ...prev, favicon: url }));
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = () => {
    if (activeField === "h1") {
      onChange((prev) => ({
        ...prev,
        hero: { ...prev.hero, heading: draft.heroHeading },
      }));
    } else if (activeField === "logo") {
      onChange((prev) => ({
        ...prev,
        brand: {
          ...prev.brand,
          logo: draft.logo,
          name: draft.brandName,
          title: draft.title,
          favicon: draft.favicon,
        },
      }));
      if (draft.favicon) {
        const link = document.querySelector("link[rel='icon']");
        if (link) link.href = draft.favicon;
      }
    } else if (activeField === "cta") {
      onChange((prev) => ({
        ...prev,
        hero: {
          ...prev.hero,
          ctaText: draft.ctaText,
          ctaColor: draft.ctaColor,
        },
      }));
    } else if (activeField === "favicon") {
      onChange((prev) => ({
        ...prev,
        brand: { ...prev.brand, favicon: draft.favicon },
      }));
      if (draft.favicon) {
        const link = document.querySelector("link[rel='icon']");
        if (link) link.href = draft.favicon;
      }
    }
    onClose();
  };

  if (activeField == null) return null;

  return (
    <div className="flex h-full flex-col border-r border-neutral-200 bg-white">
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
              value={draft.heroHeading}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, heroHeading: e.target.value }))
              }
              className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
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
                disabled={uploadingField === "logo"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "logo");
                }}
                className="w-full text-sm text-neutral-600 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700"
              />
              {uploadingField === "logo" && (
                <p className="mt-1 text-sm text-neutral-500">Uploading…</p>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Brand name
              </span>
              <input
                type="text"
                value={draft.brandName}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, brandName: e.target.value }))
                }
                className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Title
              </span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Favicon
              </span>
              <input
                type="file"
                accept="image/x-icon,image/png"
                disabled={uploadingField === "favicon"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "favicon");
                }}
                className="w-full text-sm text-neutral-600 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700"
              />
              {uploadingField === "favicon" && (
                <p className="mt-1 text-sm text-neutral-500">Uploading…</p>
              )}
            </label>
            {uploadError && activeField === "logo" && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}
          </div>
        )}

        {activeField === "cta" && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                CTA text
              </span>
              <input
                type="text"
                value={draft.ctaText}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, ctaText: e.target.value }))
                }
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
                  value={draft.ctaColor}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, ctaColor: e.target.value }))
                  }
                  className="h-10 w-14 cursor-pointer rounded border border-neutral-300"
                />
                <span className="text-sm text-neutral-600">
                  {draft.ctaColor}
                </span>
              </div>
            </label>
          </div>
        )}

        {activeField === "favicon" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Favicon
            </span>
            <input
              type="file"
              accept="image/x-icon,image/png"
              disabled={uploadingField === "favicon"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, "favicon");
              }}
              className="w-full text-sm text-neutral-600 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700"
            />
            {uploadingField === "favicon" && (
              <p className="mt-1 text-sm text-neutral-500">Uploading…</p>
            )}
            {uploadError && activeField === "favicon" && (
              <p className="mt-1 text-sm text-red-600">{uploadError}</p>
            )}
          </label>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save & close
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

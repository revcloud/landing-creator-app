function TemplateGallery({ templates, onSelect }) {
  return (
    <div className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-2xl font-semibold text-neutral-800">
          Choose a template
        </h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className="group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-neutral-200">
                <img
                  src={template.screenshot}
                  alt={template.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = '/vite.svg'
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow">
                    Select
                  </span>
                </div>
              </div>
              <span className="p-3 text-left text-sm font-medium text-neutral-700">
                {template.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TemplateGallery

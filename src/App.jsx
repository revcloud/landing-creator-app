import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Editor from "./features/landing-page-creator/Editor";
import TemplateGallery from "./features/landing-page-creator/TemplateGallery";
import VariantSelector from "./features/landing-page-creator/VariantSelector";
import { templates } from "./features/landing-page-creator/constants";

function EditorRoute() {
  const location = useLocation();
  const { state } = location;

  const templateIdFromQuery = new URLSearchParams(location.search).get(
    "templateId",
  );
  const templateFromQuery = templates.find(
    (t) => t.id === templateIdFromQuery,
  );

  const templateFromStateId = state?.templateId
    ? templates.find((t) => t.id === state.templateId)
    : null;

  const template = state?.template ?? templateFromStateId ?? templateFromQuery;
  if (!template) {
    return <Navigate to="/" replace />;
  }
  return <Editor template={template} />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<TemplateGallery templates={templates} />} />
      <Route path="/template-variants" element={<VariantSelector />} />
      <Route path="/editor" element={<EditorRoute />} />
    </Routes>
  );
}

export default App;

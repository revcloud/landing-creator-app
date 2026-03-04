import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Editor from "./features/landing-page-creator/Editor";
import TemplateGallery from "./features/landing-page-creator/TemplateGallery";
import { templates } from "./features/landing-page-creator/constants";

function EditorRoute() {
  const { state } = useLocation();
  const template = state?.template;
  if (!template) {
    return <Navigate to="/" replace />;
  }
  return <Editor template={template} />;
}

function App() {
  const navigate = useNavigate();

  function navigateToEditor(template) {
    navigate("/editor", { state: { template } });
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <TemplateGallery templates={templates} onSelect={navigateToEditor} />
        }
      />
      <Route path="/editor" element={<EditorRoute />} />
    </Routes>
  );
}

export default App;
